import type { ImageMetadata } from 'astro';
import productosJson from '../data/productos.json';
import categoriasJson from '../data/categorias.json';
import sitioJson from '../data/sitio.json';
import traduccionesJson from '../data/traducciones.json';
import { ruta, traductor, formatoEuros, huellaProducto, type Idioma } from '../i18n';

export type Precio =
  | { tipo: 'fijo'; importe: number; unidad?: string }
  | { tipo: 'desde'; importe: number; unidad?: string }
  | { tipo: 'consultar' };

export interface Variante { nombre: string; precio: number | null }
export interface Foto { archivo: string; alt: string }

export interface Producto {
  slug: string;
  nombre: string;
  categoria: string;
  etiquetas: string[];
  descripcionCorta: string;
  descripcionLarga: string;
  precio: Precio;
  variantes: Variante[];
  galeria: Foto[];
  materiales: string[];
  colores: string[];
  dimensiones: string | null;
  tiempoFabricacion: string | null;
  personalizacion: { disponible: boolean; notas: string | null };
  destacado: boolean;
  fechaAlta: string;
  composicion?: string;
  /** true si el cliente elige uno de los "colores" (selector en la ficha). */
  colorAElegir?: boolean;
  /** true = trabajo ya entregado que se enseña como ejemplo (no se vende ni sale en el catálogo). */
  ejemplo?: boolean;
  /** Página propia en lugar de la ficha estándar (p. ej. el Funko personalizado → /funkos). */
  enlace?: string;
  configurador?: 'funko';
}

export interface Categoria {
  slug: string;
  nombre: string;
  titulo: string;
  descripcion: string;
  portada: string;
  orden: number;
  enlace?: string;
}

export const sitio = sitioJson;
/** Todo lo que hay en productos.json (a la venta + ejemplos). */
export const todos = productosJson as Producto[];
/** Lo que se vende (sale en el catálogo, filtros y cesta). */
export const productos = todos.filter((p) => !p.ejemplo);
/** Encargos ya entregados que se enseñan como ejemplo (galería de Funkos hechos). */
export const ejemplos = todos.filter((p) => p.ejemplo);
export const categorias = (categoriasJson as Categoria[]).toSorted((a, b) => a.orden - b.orden);
/** Categorías que tienen piezas a la venta (salen en los filtros del catálogo). */
export const categoriasCatalogo = categorias.filter((c) => productos.some((p) => p.categoria === c.slug));

export const categoria = (slug: string) => categorias.find((c) => c.slug === slug);
/** Busca también entre los ejemplos (para usar sus fotos). */
export const producto = (slug: string) => todos.find((p) => p.slug === slug);
export const deCategoria = (slug: string) => productos.filter((p) => p.categoria === slug);

export const urlCategoria = (c: Categoria) => c.enlace ?? `/catalogo/${c.slug}`;
export const urlProducto = (p: Producto) => p.enlace ?? `/producto/${p.slug}`;

// ---- Fotos ----------------------------------------------------------------
// Las fotos viven en src/assets/productos/<slug>/01.jpg, 02.jpg…
// Para cambiarlas: sustituye el archivo (mismo nombre) o añade más y regístralas en "galeria" de productos.json.
const fotos = import.meta.glob<{ default: ImageMetadata }>('../assets/productos/*/*.{jpg,jpeg,png,webp}', { eager: true });
const ambiente = import.meta.glob<{ default: ImageMetadata }>('../assets/ambiente/*.{jpg,jpeg,png,webp}', { eager: true });

export function foto(p: Producto, i = 0): { src: ImageMetadata; alt: string } {
  const f = p.galeria[i] ?? p.galeria[0];
  const mod = fotos[`../assets/productos/${p.slug}/${f.archivo}`];
  if (!mod) throw new Error(`Falta la foto ${p.slug}/${f.archivo}`);
  return { src: mod.default, alt: f.alt };
}
export const fotosDe = (p: Producto) => p.galeria.map((_, i) => foto(p, i));
export function fotoAmbiente(nombre: string): ImageMetadata {
  const mod = ambiente[`../assets/ambiente/${nombre}`];
  if (!mod) throw new Error(`Falta la foto de ambiente ${nombre}`);
  return mod.default;
}

// ---- Precios ----------------------------------------------------------------
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const euros = (n: number) => eur.format(n);

/** Precio para ordenar y filtrar: null si es "a consultar". */
export const precioNumerico = (p: Producto): number | null => (p.precio.tipo === 'consultar' ? null : p.precio.importe);

export function textoPrecio(p: Producto): string {
  const pr = p.precio;
  if (pr.tipo === 'consultar') return 'Precio a consultar';
  const unidad = pr.unidad ? ` / ${pr.unidad}` : '';
  const desdeVariantes = p.variantes.filter((v) => v.precio != null).length > 1;
  if (pr.tipo === 'desde' || desdeVariantes) {
    const min = Math.min(pr.importe, ...p.variantes.map((v) => v.precio ?? Infinity));
    return `Desde ${euros(min)}${unidad}`;
  }
  return `${euros(pr.importe)}${unidad}`;
}

export function desdeCategoria(slug: string): number | null {
  const ps = deCategoria(slug).flatMap((p) => [precioNumerico(p), ...p.variantes.map((v) => v.precio)]).filter((n): n is number => n != null);
  return ps.length ? Math.min(...ps) : null;
}

export function relacionados(p: Producto, n = 4): Producto[] {
  return deCategoria(p.categoria)
    .filter((o) => o.slug !== p.slug)
    .toSorted((a, b) => Number(b.destacado) - Number(a.destacado) || b.fechaAlta.localeCompare(a.fechaAlta))
    .slice(0, n);
}

export const todosLosMateriales = [...new Set(productos.flatMap((p) => p.materiales))].sort();
export const todosLosColores = [...new Set(productos.flatMap((p) => p.colores))].filter((c) => c !== 'A elegir').sort((a, b) => a.localeCompare(b, 'es'));

export const enlaceWhatsApp = (texto: string) => `https://wa.me/${sitio.whatsapp}?text=${encodeURIComponent(texto)}`;

// ---- Idiomas ----------------------------------------------------------------
// Las páginas en inglés y francés piden el catálogo con catalogoEn('en' | 'fr'): mismos datos, textos traducidos
// (src/data/traducciones.json) y enlaces con su prefijo (/en/producto/...). En español devuelve lo de siempre.
// Si el español de un producto cambió desde que se tradujo (huella distinta), sale en español hasta el próximo build,
// que lo traduce solo (scripts/traducir.mjs).
type TextosProducto = { nombre: string; descripcionCorta: string; descripcionLarga: string; alts: string[] };
type TextosCategoria = { nombre: string; titulo: string; descripcion: string };
const T = traduccionesJson as unknown as {
  productos: Record<string, { huella: string; en?: TextosProducto; fr?: TextosProducto }>;
  categorias: Record<string, { en?: TextosCategoria; fr?: TextosCategoria }>;
  vocabulario: Record<string, { en?: string; fr?: string }>;
};

/** Palabras y frases sueltas (colores, medidas, composiciones…) en otro idioma; si no está, se queda en español. */
export const vocab = (s: string, l: Idioma) => (l === 'es' ? s : T.vocabulario[s]?.[l] ?? s);
const vocabN = (s: string | null | undefined, l: Idioma) => (s ? vocab(s, l) : s ?? null);

function localizarProducto(p: Producto, l: Idioma): Producto {
  if (l === 'es') return p;
  const tr = T.productos[p.slug];
  const t = tr && tr.huella === huellaProducto(p) ? tr[l] : undefined;
  return {
    ...p,
    nombre: t?.nombre ?? p.nombre,
    descripcionCorta: t?.descripcionCorta ?? p.descripcionCorta,
    descripcionLarga: t?.descripcionLarga ?? p.descripcionLarga,
    galeria: p.galeria.map((g, i) => ({ ...g, alt: t?.alts?.[i] ?? g.alt })),
    dimensiones: vocabN(p.dimensiones, l),
    tiempoFabricacion: vocabN(p.tiempoFabricacion, l),
    ...(p.composicion ? { composicion: vocab(p.composicion, l) } : {}),
    personalizacion: { ...p.personalizacion, notas: vocabN(p.personalizacion.notas, l) },
    precio: p.precio.tipo !== 'consultar' && p.precio.unidad ? { ...p.precio, unidad: vocab(p.precio.unidad, l) } : p.precio,
    ...(p.enlace ? { enlace: ruta(l, p.enlace) } : {}),
  };
}

function localizarCategoria(c: Categoria, l: Idioma): Categoria {
  if (l === 'es') return c;
  const t = T.categorias[c.slug]?.[l];
  return { ...c, ...(t ?? {}), ...(c.enlace ? { enlace: ruta(l, c.enlace) } : {}) };
}

const cache = new Map<Idioma, ReturnType<typeof crearCatalogo>>();
/** El catálogo en un idioma. Uso: const C = catalogoEn(idiomaDe(Astro.url)). */
export const catalogoEn = (l: Idioma) => cache.get(l) ?? (cache.set(l, crearCatalogo(l)), cache.get(l)!);

function crearCatalogo(l: Idioma) {
  const t = traductor(l);
  const euros = formatoEuros(l);
  const todosL = todos.map((p) => localizarProducto(p, l));
  const productosL = todosL.filter((p) => !p.ejemplo);
  const ejemplosL = todosL.filter((p) => p.ejemplo);
  const categoriasL = categorias.map((c) => localizarCategoria(c, l));
  const deCategoriaL = (slug: string) => productosL.filter((p) => p.categoria === slug);
  const urlCategoriaL = (c: Categoria) => c.enlace ?? ruta(l, `/catalogo/${c.slug}`);
  const urlProductoL = (p: Producto) => p.enlace ?? ruta(l, `/producto/${p.slug}`);
  function textoPrecioL(p: Producto): string {
    const pr = p.precio;
    if (pr.tipo === 'consultar') return t('Precio a consultar', 'Price on request', 'Prix sur demande');
    const unidad = pr.unidad ? ` / ${pr.unidad}` : '';
    const desdeVariantes = p.variantes.filter((v) => v.precio != null).length > 1;
    if (pr.tipo === 'desde' || desdeVariantes) {
      const min = Math.min(pr.importe, ...p.variantes.map((v) => v.precio ?? Infinity));
      return `${t('Desde', 'From', 'À partir de')} ${euros(min)}${unidad}`;
    }
    return `${euros(pr.importe)}${unidad}`;
  }
  function desdeCategoriaL(slug: string): number | null {
    const ps = deCategoriaL(slug).flatMap((p) => [precioNumerico(p), ...p.variantes.map((v) => v.precio)]).filter((n): n is number => n != null);
    return ps.length ? Math.min(...ps) : null;
  }
  return {
    l, t, euros,
    ruta: (p: string) => ruta(l, p),
    todos: todosL,
    productos: productosL,
    ejemplos: ejemplosL,
    categorias: categoriasL,
    categoriasCatalogo: categoriasL.filter((c) => productosL.some((p) => p.categoria === c.slug)),
    categoria: (slug: string) => categoriasL.find((c) => c.slug === slug),
    producto: (slug: string) => todosL.find((p) => p.slug === slug),
    /** Un producto (p. ej. el que llega en los props de la página) traducido a este idioma. */
    loc: (p: Producto) => todosL.find((x) => x.slug === p.slug) ?? localizarProducto(p, l),
    deCategoria: deCategoriaL,
    urlCategoria: urlCategoriaL,
    urlProducto: urlProductoL,
    textoPrecio: textoPrecioL,
    desdeCategoria: desdeCategoriaL,
    relacionados: (p: Producto, n = 4) => deCategoriaL(p.categoria)
      .filter((o) => o.slug !== p.slug)
      .toSorted((a, b) => Number(b.destacado) - Number(a.destacado) || b.fechaAlta.localeCompare(a.fechaAlta))
      .slice(0, n),
    /** Color o material para enseñar (los datos y filtros siguen en español). */
    voc: (s: string) => vocab(s, l),
  };
}
