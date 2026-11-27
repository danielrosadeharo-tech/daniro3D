// Función de Vercel: estadísticas de visitas propias (sin cookies), para verlas en el panel.
// - POST (lo manda cada página de la web al abrirse): suma la visita al resumen del día en Firestore
//   (estadisticas/{AAAA-MM-DD}). Para contar personas y no solo páginas, cada visitante se identifica con una
//   huella anónima: la IP y el navegador cifrados junto con la fecha y una clave secreta. Cambia cada día y no
//   se puede deshacer; la IP no se guarda nunca.
// - GET (lo pide el panel): devuelve el resumen de los últimos días. Solo para administradores.
// Usa la misma variable FIREBASE_SERVICE_ACCOUNT que los avisos de pedidos. Firestore no deja leer ni escribir
// "estadisticas" desde la web: solo esta función.
import { createHash } from 'node:crypto';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const ONLINE_MIN = 5;
const BOT = /bot\b|bot\/|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|node-fetch|axios|go-http|java\//i;

let sal = '';
function app(): App {
  const ya = getApps()[0];
  if (ya && sal) return ya;
  let cuenta: any;
  // No se registra el error de JSON.parse: su mensaje copia un trozo de la clave en los registros
  try { cuenta = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!.trim()); } catch { throw new Error('clave'); }
  if (!cuenta?.private_key || !cuenta?.client_email) throw new Error('clave');
  sal = createHash('sha256').update(`estadisticas:${cuenta.private_key}`).digest('hex');
  return ya ?? initializeApp({ credential: cert(cuenta) });
}

/** Fecha en España, AAAA-MM-DD. */
const fecha = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(d);
/** Las claves de los mapas de Firestore van codificadas (rutas y dominios llevan / y .). */
const k = (s: string) => encodeURIComponent(s).replace(/\./g, '%2E');
const dek = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

function dispositivo(ua: string) {
  if (/iPad|Tablet|Nexus (7|9|10)|SM-T|Tab\b/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'Tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'Móvil';
  return 'Ordenador';
}
function navegador(ua: string) {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Instagram/.test(ua)) return 'Instagram';
  if (/FBAN|FBAV/.test(ua)) return 'Facebook';
  if (/FxiOS|Firefox\//.test(ua)) return 'Firefox';
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Otro';
}
function sistema(ua: string) {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Otro';
}
/** De dónde llega: el dominio de la página anterior (sin www), agrupando los conocidos. */
function origen(ref: string, propio: string) {
  let h = '';
  try { h = new URL(ref).hostname.toLowerCase().replace(/^www\./, ''); } catch { return 'Directo'; }
  if (!h || h === propio || h.endsWith('.vercel.app') && h.startsWith('daniro')) return 'Directo';
  if (/(^|\.)google\./.test(h) || h === 'com.google.android.googlequicksearchbox') return 'Google';
  if (/(^|\.)instagram\.com$/.test(h)) return 'Instagram';
  if (/(^|\.)facebook\.com$|^fb\.me$/.test(h)) return 'Facebook';
  if (/whatsapp|^wa\.me$/.test(h)) return 'WhatsApp';
  if (/(^|\.)tiktok\.com$/.test(h)) return 'TikTok';
  if (/(^|\.)wallapop\.com$/.test(h)) return 'Wallapop';
  if (/(^|\.)vinted\./.test(h)) return 'Vinted';
  if (/(^|\.)bing\.com$/.test(h)) return 'Bing';
  if (/(^|\.)duckduckgo\.com$/.test(h)) return 'DuckDuckGo';
  if (/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/.test(h)) return 'X (Twitter)';
  return h.slice(0, 60);
}

async function registrar(req: any, res: any) {
  let body: any = req.body ?? {};
  if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch { return res.status(400).end(); } }
  const ua = String(req.headers['user-agent'] ?? '');
  if (!ua || BOT.test(ua)) return res.status(204).end();
  let ruta = String(body.p ?? '/').split(/[?#]/)[0].replace(/\.html$/, '').replace(/\/index$/, '/');
  if (ruta.length > 1) ruta = ruta.replace(/\/+$/, '');
  if (!ruta.startsWith('/') || ruta.length > 120 || /^\/(admin|api)(\/|$)/.test(ruta)) return res.status(204).end();

  const ip = String(req.headers['x-forwarded-for'] ?? req.headers['x-real-ip'] ?? '').split(',')[0].trim();
  const pais = String(req.headers['x-vercel-ip-country'] ?? '').toUpperCase().slice(0, 2) || '??';
  const propio = String(req.headers.host ?? '').toLowerCase().replace(/^www\./, '');
  const hoy = fecha();

  const db = getFirestore(app());
  const id = createHash('sha256').update(`${sal}|${hoy}|${ip}|${ua}`).digest('hex').slice(0, 32);
  const dia = db.doc(`estadisticas/${hoy}`);
  const vis = dia.collection('visitantes').doc(id);
  const uno = FieldValue.increment(1);
  const ahora = Timestamp.now();

  await db.runTransaction(async (t) => {
    const v = await t.get(vis);
    if (!v.exists) {
      // Primera página del día de esta persona: cuenta como visitante, con su origen, país y aparato
      t.set(vis, { n: 1, ultima: ahora });
      t.set(dia, {
        fecha: hoy, vistas: uno, visitantes: uno,
        paginas: { [k(ruta)]: uno },
        origenes: { [k(origen(String(body.r ?? ''), propio))]: uno },
        paises: { [k(pais)]: uno },
        dispositivos: { [k(dispositivo(ua))]: uno },
        navegadores: { [k(navegador(ua))]: uno },
        sistemas: { [k(sistema(ua))]: uno },
      }, { merge: true });
    } else {
      const n = (Number(v.get('n')) || 1) + 1;
      t.update(vis, { n, ultima: ahora });
      // Rebote = visitantes que solo vieron una página; aquí se cuentan los que pasan a la segunda
      t.set(dia, { vistas: uno, paginas: { [k(ruta)]: uno }, ...(n === 2 ? { repiten: uno } : {}) }, { merge: true });
    }
  });
  return res.status(204).end();
}

async function leer(req: any, res: any) {
  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const db = getFirestore(app());
  const { uid } = await getAuth(app()).verifyIdToken(token).catch(() => ({ uid: '' }));
  if (!uid || !(await db.doc(`admins/${uid}`).get()).exists) return res.status(403).json({ error: 'Solo administradores.' });

  const n = Math.min(90, Math.max(1, Number(req.query?.dias) || 30));
  const fechas = Array.from({ length: n }, (_, i) => fecha(new Date(Date.now() - (n - 1 - i) * 86400000)));
  const docs = await db.getAll(...fechas.map((f) => db.doc(`estadisticas/${f}`)));
  const desde = Timestamp.fromMillis(Date.now() - ONLINE_MIN * 60000);
  const online = (await db.collection(`estadisticas/${fecha()}/visitantes`).where('ultima', '>', desde).count().get()).data().count;

  const sumar = (campo: string) => {
    const total: Record<string, number> = {};
    for (const d of docs) for (const [clave, v] of Object.entries((d.get(campo) ?? {}) as Record<string, number>)) {
      const c = dek(clave); total[c] = (total[c] ?? 0) + (Number(v) || 0);
    }
    return Object.entries(total).sort((a, b) => b[1] - a[1]);
  };
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    online,
    dias: docs.map((d, i) => ({ fecha: fechas[i], vistas: Number(d.get('vistas')) || 0, visitantes: Number(d.get('visitantes')) || 0, repiten: Number(d.get('repiten')) || 0 })),
    paginas: sumar('paginas'), origenes: sumar('origenes'), paises: sumar('paises'),
    dispositivos: sumar('dispositivos'), navegadores: sumar('navegadores'), sistemas: sumar('sistemas'),
  });
}

export default async function handler(req: any, res: any) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(503).json({ error: 'Falta FIREBASE_SERVICE_ACCOUNT en Vercel.' });
  try {
    if (req.method === 'POST') return await registrar(req, res);
    if (req.method === 'GET') return await leer(req, res);
    return res.status(405).json({ error: 'Usa GET o POST.' });
  } catch (e: any) {
    if (e?.message === 'clave') { console.error('estadisticas: FIREBASE_SERVICE_ACCOUNT no es el JSON de la clave de Firebase'); return res.status(503).json({ error: 'Clave de Firebase no válida.' }); }
    console.error('estadisticas', e);
    return res.status(500).json({ error: 'No se pudieron guardar o leer las estadísticas.' });
  }
}
