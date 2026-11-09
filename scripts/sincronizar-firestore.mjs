// Se ejecuta antes de `astro build` (npm run build).
// Descarga de Firestore los productos (y las categorías, si hay) y las fotos subidas desde el panel,
// y los deja en src/data/*.json y src/assets/productos/<slug>/ para que Astro genere la web estática.
// Si Firebase no está configurado o la colección está vacía, no toca nada y se usa productos.json del repositorio.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Lee .env en local (en Vercel las variables ya vienen en process.env)
if (existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const PROJECT = process.env.PUBLIC_FIREBASE_PROJECT_ID;
const KEY = process.env.PUBLIC_FIREBASE_API_KEY;
const log = (...a) => console.log('[firestore]', ...a);

if (!PROJECT || !KEY) {
  log('sin variables PUBLIC_FIREBASE_*: se usa src/data/productos.json');
  process.exit(0);
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function valor(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(valor);
  if ('mapValue' in v) return campos(v.mapValue.fields ?? {});
  return null;
}
const campos = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, valor(v)]));

async function coleccion(nombre) {
  const docs = [];
  let token = '';
  do {
    const r = await fetch(`${BASE}/${nombre}?pageSize=300&key=${KEY}${token ? `&pageToken=${token}` : ''}`);
    if (!r.ok) throw new Error(`${nombre}: HTTP ${r.status} ${await r.text()}`);
    const j = await r.json();
    for (const d of j.documents ?? []) docs.push({ id: d.name.split('/').pop(), ...campos(d.fields ?? {}) });
    token = j.nextPageToken ?? '';
  } while (token);
  return docs;
}

const arr = (x) => (Array.isArray(x) ? x : []);
function normalizar(p) {
  return {
    slug: p.slug || p.id,
    nombre: String(p.nombre ?? p.id),
    categoria: String(p.categoria ?? 'otros'),
    etiquetas: arr(p.etiquetas),
    descripcionCorta: String(p.descripcionCorta ?? ''),
    descripcionLarga: String(p.descripcionLarga ?? p.descripcionCorta ?? ''),
    precio: p.precio?.tipo ? p.precio : { tipo: 'consultar' },
    variantes: arr(p.variantes),
    galeria: arr(p.galeria),
    materiales: arr(p.materiales),
    colores: arr(p.colores),
    dimensiones: p.dimensiones || null,
    tiempoFabricacion: p.tiempoFabricacion || null,
    personalizacion: { disponible: Boolean(p.personalizacion?.disponible), notas: p.personalizacion?.notas || null },
    destacado: Boolean(p.destacado),
    fechaAlta: String(p.fechaAlta ?? new Date().toISOString().slice(0, 10)),
    ...(p.composicion ? { composicion: p.composicion } : {}),
    ...(p.configurador ? { configurador: p.configurador } : {}),
    ...(p.colorAElegir ? { colorAElegir: true } : {}),
    ...(p.ejemplo ? { ejemplo: true } : {}),
    ...(p.enlace ? { enlace: p.enlace } : {}),
  };
}

try {
  const productos = await coleccion('productos');
  if (!productos.length) {
    log('la colección "productos" está vacía: se usa src/data/productos.json');
    process.exit(0);
  }
  const salida = [];
  for (const raw of productos) {
    const p = normalizar(raw);
    const dir = join('src', 'assets', 'productos', p.slug);
    mkdirSync(dir, { recursive: true });
    const galeria = [];
    for (const [i, g] of p.galeria.entries()) {
      const archivo = (g.archivo || `foto-${i + 1}.jpg`).replace(/[^\w.\-]+/g, '_');
      const destino = join(dir, archivo);
      if (g.url) {
        const r = await fetch(g.url);
        if (!r.ok) { log(`AVISO ${p.slug}: no se pudo descargar ${archivo} (HTTP ${r.status})`); continue; }
        writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
      } else if (!existsSync(destino)) {
        log(`AVISO ${p.slug}: falta la foto ${archivo} y no tiene url; se omite`);
        continue;
      }
      galeria.push({ archivo, alt: g.alt || p.nombre });
    }
    if (!galeria.length) { log(`AVISO ${p.slug}: sin fotos, no se publica`); continue; }
    salida.push({ ...p, galeria });
  }
  writeFileSync(join('src', 'data', 'productos.json'), JSON.stringify(salida, null, 2));
  log(`${salida.length} productos desde Firestore`);

  const cats = await coleccion('categorias').catch(() => []);
  if (cats.length) {
    const lista = cats.map(({ id, ...c }) => ({ slug: c.slug || id, ...c })).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
    writeFileSync(join('src', 'data', 'categorias.json'), JSON.stringify(lista, null, 2));
    log(`${lista.length} categorías desde Firestore`);
  }
} catch (e) {
  // Si Firestore falla, se publica con los datos del repositorio en vez de romper el despliegue
  log('ERROR leyendo Firestore, se usan los datos del repositorio:', e.message);
}
