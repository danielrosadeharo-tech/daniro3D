// Conexión con Firebase (solo en el navegador). La configuración llega de las variables PUBLIC_FIREBASE_*.
// Si faltan, la web sigue funcionando como antes (pedidos por WhatsApp) y `firebaseActivo` es false.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, getRedirectResult, signInWithPopup, signInWithRedirect, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { idiomaDocumento, traductor } from '../i18n';

// En la web publicada, el acceso con Google pasa por /__/auth/ del propio dominio (vercel.json lo reenvía a
// firebaseapp.com). Así el navegador no lo trata como de otro sitio y no bloquea la sesión al volver de Google.
// Requiere añadir https://<dominio>/__/auth/handler a los URI de redirección del cliente OAuth en Google Cloud.
const enLocal = typeof location === 'undefined' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: enLocal ? import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN : location.host,
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

/**
 * Llamar al cargar la página. Firebase necesita un iframe de Google antes de abrir la ventana de acceso;
 * si lo carga en el clic tarda tanto que el navegador deja de verlo como un clic y bloquea la ventana.
 * Esto lo precarga y, de paso, recoge el resultado si se entró redirigiendo a Google.
 * Devuelve el mensaje de error de ese acceso, o null.
 */
export const prepararGoogle = (): Promise<string | null> =>
  getRedirectResult(auth()).then(() => null, (e) => mensajeError(e) || null);

/** Abre la ventana de Google; si el navegador la bloquea, entra redirigiendo la página a Google. */
export async function entrarConGoogle(): Promise<void> {
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth(), proveedor);
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth(), proveedor);
      return;
    }
    throw e;
  }
}

/** Firestore reintenta en silencio si no llega al servidor: esto corta la espera y lanza un error. */
export function conLimite<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(Object.assign(new Error('tiempo'), { code: 'tiempo' })), ms))]);
}

/** Mensajes de error de Firebase para el usuario, en el idioma de la página (el panel, siempre en español). */
export function mensajeError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const l = idiomaDocumento();
  if (l !== 'es') {
    const t = traductor(l);
    const fuera: Record<string, string> = {
      'auth/invalid-credential': t('', 'The email or password is incorrect.', "L'e-mail ou le mot de passe est incorrect."),
      'auth/invalid-email': t('', "That email isn't valid.", "Cet e-mail n'est pas valide."),
      'auth/user-not-found': t('', 'There is no account with that email.', "Aucun compte n'existe avec cet e-mail."),
      'auth/wrong-password': t('', 'The password is incorrect.', 'Le mot de passe est incorrect.'),
      'auth/email-already-in-use': t('', 'There is already an account with that email. Try signing in.', 'Un compte existe déjà avec cet e-mail. Essayez de vous connecter.'),
      'auth/weak-password': t('', 'The password must be at least 6 characters long.', 'Le mot de passe doit contenir au moins 6 caractères.'),
      'auth/too-many-requests': t('', 'Too many attempts. Wait a few minutes and try again.', 'Trop de tentatives. Attendez quelques minutes et réessayez.'),
      'auth/popup-closed-by-user': t('', 'The Google window was closed before finishing.', 'La fenêtre Google a été fermée avant la fin.'),
      'auth/cancelled-popup-request': '',
      'auth/popup-blocked': t('', 'Your browser blocked the Google window. Allow pop-ups for this site and try again.', 'Votre navigateur a bloqué la fenêtre Google. Autorisez les fenêtres pop-up pour ce site et réessayez.'),
      'auth/web-storage-unsupported': t('', 'Your browser blocks the storage Google sign-in needs. Try signing in with email.', 'Votre navigateur bloque le stockage nécessaire à la connexion Google. Essayez avec votre e-mail.'),
      'auth/network-request-failed': t('', 'No connection to the server. Check your internet.', 'Pas de connexion au serveur. Vérifiez votre connexion internet.'),
      'unavailable': t('', 'No connection to the server. Check your internet.', 'Pas de connexion au serveur. Vérifiez votre connexion internet.'),
      'tiempo': t('', 'The server is taking too long to respond.', 'Le serveur met trop de temps à répondre.'),
      'permission-denied': t('', "You don't have permission to do this.", "Vous n'avez pas l'autorisation de faire cela."),
    };
    return fuera[code] ?? t('', `Something went wrong (${code || (e as Error)?.message || 'unknown'}).`, `Une erreur s'est produite (${code || (e as Error)?.message || 'inconnue'}).`);
  }
  const m: Record<string, string> = {
    'auth/invalid-credential': 'El email o la contraseña no son correctos.',
    'auth/invalid-email': 'Ese email no es válido.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese email.',
    'auth/wrong-password': 'La contraseña no es correcta.',
    'auth/email-already-in-use': 'Ya hay una cuenta con ese email. Prueba a entrar.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
    'auth/cancelled-popup-request': '',
    'auth/popup-blocked': 'Tu navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes para esta web y vuelve a probar.',
    'auth/web-storage-unsupported': 'Tu navegador bloquea el almacenamiento que necesita el acceso con Google. Prueba a entrar con email.',
    'auth/operation-not-allowed': 'Este método de acceso no está activado en Firebase Authentication.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication (Configuración → Dominios autorizados).',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'La configuración de Firebase no es válida (revisa PUBLIC_FIREBASE_API_KEY).',
    'auth/network-request-failed': 'Sin conexión con el servidor. Revisa tu internet.',
    'tiempo': 'El servidor tarda demasiado en responder.',
    'permission-denied': 'No tienes permiso para hacer esto.',
    'unavailable': 'Sin conexión con el servidor. Revisa tu internet.',
    'storage/unauthorized': 'No tienes permiso para subir este archivo.',
    'storage/unknown': 'No se pudo subir el archivo. ¿Está activado Firebase Storage?',
    'messaging/permission-blocked': 'Las notificaciones están bloqueadas para esta web en el navegador.',
    'messaging/token-subscribe-failed': 'Firebase no ha podido registrar este móvil para los avisos (revisa que Cloud Messaging esté activado en el proyecto).',
    'messaging/unsupported-browser': 'Este navegador no admite avisos.',
    'messaging/failed-service-worker-registration': 'No se pudo preparar el servicio de avisos en este navegador.',
  };
  return m[code] ?? `Ha habido un error (${code || (e as Error)?.message || 'desconocido'}).`;
}
