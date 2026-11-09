// Conexión con Firebase (solo en el navegador). La configuración llega de las variables PUBLIC_FIREBASE_*.
// Si faltan, la web sigue funcionando como antes (pedidos por WhatsApp) y `firebaseActivo` es false.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

export const firebaseActivo = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
function laApp() {
  if (!firebaseActivo) throw new Error('Firebase no está configurado (faltan las variables PUBLIC_FIREBASE_*).');
  return (app ??= getApps()[0] ?? initializeApp(config));
}
export const auth = (): Auth => getAuth(laApp());
export const db = (): Firestore => getFirestore(laApp());
export const storage = (): FirebaseStorage => getStorage(laApp());

/** Firestore reintenta en silencio si no llega al servidor: esto corta la espera y lanza un error. */
export function conLimite<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(Object.assign(new Error('tiempo'), { code: 'tiempo' })), ms))]);
}

/** Mensajes de error de Firebase en español, para enseñárselos al usuario. */
export function mensajeError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const m: Record<string, string> = {
    'auth/invalid-credential': 'El email o la contraseña no son correctos.',
    'auth/invalid-email': 'Ese email no es válido.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese email.',
    'auth/wrong-password': 'La contraseña no es correcta.',
    'auth/email-already-in-use': 'Ya hay una cuenta con ese email. Prueba a entrar.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
    'auth/operation-not-allowed': 'Este método de acceso no está activado en Firebase Authentication.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication (Configuración → Dominios autorizados).',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'La configuración de Firebase no es válida (revisa PUBLIC_FIREBASE_API_KEY).',
    'auth/network-request-failed': 'Sin conexión con el servidor. Revisa tu internet.',
    'tiempo': 'El servidor tarda demasiado en responder.',
    'permission-denied': 'No tienes permiso para hacer esto.',
    'unavailable': 'Sin conexión con el servidor. Revisa tu internet.',
    'storage/unauthorized': 'No tienes permiso para subir este archivo.',
    'storage/unknown': 'No se pudo subir el archivo. ¿Está activado Firebase Storage?',
  };
  return m[code] ?? `Ha habido un error (${code || (e as Error)?.message || 'desconocido'}).`;
}
