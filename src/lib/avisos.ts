// Avisos de pedidos nuevos en el móvil del administrador (notificaciones push con Firebase Cloud Messaging).
// - El administrador los activa en /admin: se instala /sw.js y el token del móvil se guarda en ajustes/avisos.
// - Al guardar un pedido o encargo, la web llama a /api/avisar-pedido, que manda el aviso a esos móviles.
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const CLAVE = 'daniro3d:aviso-token';
const leerToken = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };
const guardarToken = (t: string | null) => { try { t ? localStorage.setItem(CLAVE, t) : localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };
const ajustes = () => doc(db(), 'ajustes', 'avisos');

export const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const instalada = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export type EstadoAvisos = 'activos' | 'apagados' | 'bloqueados' | 'instalar-ios' | 'no-compatible';

export async function estadoAvisos(): Promise<EstadoAvisos> {
  const basico = 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window;
  if (!basico || !(await isSupported().catch(() => false))) return esIOS() && !instalada() ? 'instalar-ios' : 'no-compatible';
  if (Notification.permission === 'denied') return 'bloqueados';
  return Notification.permission === 'granted' && leerToken() ? 'activos' : 'apagados';
}

/** Pide permiso, instala el service worker y guarda el token de este móvil. Hay que llamarla desde un clic. */
export async function activarAvisos(): Promise<void> {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error(permiso === 'denied' ? 'bloqueados' : 'sin-permiso');
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(), { serviceWorkerRegistration: reg });
  if (!token) throw new Error('sin-token');
  await setDoc(ajustes(), { tokens: arrayUnion(token), actualizado: serverTimestamp() }, { merge: true });
  guardarToken(token);
}

/** Deja de mandar avisos a este móvil. */
export async function desactivarAvisos(): Promise<void> {
  const token = leerToken();
  if (token) await updateDoc(ajustes(), { tokens: arrayRemove(token) }).catch(() => {});
  await deleteToken(getMessaging()).catch(() => {});
  guardarToken(null);
}

/** Manda un aviso de prueba a los móviles del administrador. Devuelve cuántos lo recibieron. */
export async function probarAvisos(): Promise<number> {
  const idToken = await auth().currentUser?.getIdToken();
  const r = await fetch('/api/avisar-pedido', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ prueba: true }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j.enviados ?? 0;
}
