// Se ejecuta en cada build, después de sincronizar-firestore.mjs y antes de astro build.
// Traduce al inglés y al francés los productos nuevos o editados desde el panel (los que no están en
// src/data/traducciones.json o cuyo español cambió) y las palabras sueltas nuevas (colores, medidas…).
//
// - Traductor: MyMemory (gratis, sin clave). Si falla o se acaba el cupo del día, el producto sale en español
//   y se vuelve a intentar en la siguiente publicación. La web nunca deja de publicarse por esto.
// - Caché: si Vercel tiene FIREBASE_SERVICE_ACCOUNT, lo traducido se guarda en Firestore (traducciones/<slug>)
//   para no volver a traducirlo en cada publicación. Las traducciones a mano de traducciones.json mandan siempre.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { huellaProducto } from '../src/i18n/huella.js';

const log = (...a) => console.log('[traducir]', ...a);
const RUTA = 'src/data/traducciones.json';
const IDIOMAS = ['en', 'fr'];

const productos = JSON.parse(readFileSync('src/data/productos.json', 'utf8'));
const T = JSON.parse(readFileSync(RUTA, 'utf8'));
T.productos ??= {}; T.categorias ??= {}; T.vocabulario ??= {};

// ---- Caché en Firestore (opcional) ----
let db = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const { initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    db = getFirestore(initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.trim())) }, 'traducir'));
  } catch { log('sin caché: FIREBASE_SERVICE_ACCOUNT no es válida'); db = null; }
}
const cache = { productos: {}, vocabulario: {} };
if (db) {
  try {
    const s = await db.collection('traducciones').get();
    for (const d of s.docs) {
      if (d.id === '_vocabulario') for (const v of d.get('lista') ?? []) cache.vocabulario[v.es] = { en: v.en, fr: v.fr };
      else cache.productos[d.id] = d.data();
    }
    log(`caché: ${Object.keys(cache.productos).length} productos, ${Object.keys(cache.vocabulario).length} palabras`);
  } catch (e) { log('no se pudo leer la caché:', e.message); }
}

// ---- Traductor ----
let agotado = false;
const entidades = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
/** MyMemory admite unos 500 caracteres por consulta: los textos largos se parten por frases. */
function trozos(texto) {
  const frases = texto.match(/[^.!?]+[.!?]*\s*/g) ?? [texto];
  const out = []; let actual = '';
  for (const f of frases) {
    if ((actual + f).length > 450 && actual) { out.push(actual); actual = ''; }
    actual += f;
  }
  if (actual) out.push(actual);
  return out;
}
async function traducir(texto, idioma) {
  if (!texto || agotado) return null;
  const partes = [];
  for (const trozo of trozos(texto)) {
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(trozo.trim())}&langpair=es|${idioma}`, { signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      const t = j?.responseData?.translatedText;
      if (j?.responseStatus !== 200 || !t || /MYMEMORY WARNING|QUOTA/i.test(t)) { agotado = /QUOTA|WARNING/i.test(t ?? '') || j?.responseStatus === 429; return null; }
      partes.push(entidades(t).trim());
    } catch { return null; }
  }
  return partes.join(' ');
}

// ---- Productos ----
let nuevos = 0, pendientes = 0;
for (const p of productos) {
  const h = huellaProducto(p);
  if (T.productos[p.slug]?.huella === h) continue; // traducción a mano al día
  const c = cache.productos[p.slug];
  if (c?.huella === h && c.en && c.fr) { T.productos[p.slug] = c; continue; } // ya traducido en otra publicación
  const tr = { huella: h };
  for (const l of IDIOMAS) {
    const nombre = await traducir(p.nombre, l);
    const descripcionCorta = await traducir(p.descripcionCorta, l);
    const descripcionLarga = await traducir(p.descripcionLarga, l);
    const alts = [];
    for (const g of p.galeria ?? []) alts.push((await traducir(g.alt, l)) ?? g.alt);
    if (nombre && descripcionCorta && descripcionLarga) tr[l] = { nombre, descripcionCorta, descripcionLarga, alts };
  }
  if (tr.en && tr.fr) {
    T.productos[p.slug] = tr; nuevos++;
    if (db) await db.collection('traducciones').doc(p.slug).set({ ...tr, auto: true }).catch(() => {});
  } else { pendientes++; delete T.productos[p.slug]; }
}

// ---- Vocabulario (colores, materiales, medidas, plazos, composiciones, notas) ----
const sueltos = new Set();
for (const p of productos) {
  for (const s of [...(p.colores ?? []), ...(p.materiales ?? []), ...(p.variantes ?? []).map((v) => v.nombre), p.dimensiones, p.tiempoFabricacion, p.composicion, p.personalizacion?.notas, p.precio?.unidad]) {
    if (s && !T.vocabulario[s]) sueltos.add(s);
  }
}
const vocabNuevo = [];
for (const s of sueltos) {
  if (cache.vocabulario[s]) { T.vocabulario[s] = cache.vocabulario[s]; continue; }
  const en = await traducir(s, 'en'), fr = await traducir(s, 'fr');
  if (en && fr) { T.vocabulario[s] = { en, fr }; vocabNuevo.push({ es: s, en, fr }); }
}
if (db && vocabNuevo.length) {
  const lista = [...Object.entries(cache.vocabulario).map(([es, v]) => ({ es, ...v })), ...vocabNuevo];
  await db.collection('traducciones').doc('_vocabulario').set({ lista }).catch(() => {});
}

writeFileSync(RUTA, JSON.stringify(T, null, 2) + '\n');
log(`${nuevos} productos traducidos ahora, ${vocabNuevo.length} palabras nuevas${pendientes ? `, ${pendientes} quedan en español hasta la próxima publicación` : ''}${agotado ? ' (cupo del traductor agotado por hoy)' : ''}`);
process.exit(0);
