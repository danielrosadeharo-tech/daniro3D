import type { ImageMetadata } from 'astro';
import productosJson from '../data/productos.json';
import categoriasJson from '../data/categorias.json';
import sitioJson from '../data/sitio.json';

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
