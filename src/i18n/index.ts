// Idiomas de la web. El español vive en la raíz (/catalogo) y el inglés y el francés con prefijo (/en/catalogo, /fr/catalogo).
// Las páginas no se duplican: las de /en y /fr importan la página española, que mira la URL para saber en qué idioma pintar.

export type Idioma = 'es' | 'en' | 'fr';
export const IDIOMAS: Idioma[] = ['es', 'en', 'fr'];
export const NOMBRE_IDIOMA: Record<Idioma, string> = { es: 'Español', en: 'English', fr: 'Français' };
export const LOCALE: Record<Idioma, string> = { es: 'es-ES', en: 'en-GB', fr: 'fr-FR' };
/** Clave de localStorage con el idioma que eligió el visitante a mano (manda sobre el del dispositivo). */
export const CLAVE_IDIOMA = 'daniro3d:idioma';

// También vale /en.html (así llega la portada de cada idioma al generar la web con build.format 'file')
const PREFIJO = /^\/(en|fr)(?=[/.]|$)/;

/** Idioma de una URL o ruta: /en/... → en, /fr/... → fr, lo demás → es. */
export function idiomaDe(x: URL | string): Idioma {
  const p = typeof x === 'string' ? x : x.pathname;
  const m = PREFIJO.exec(p);
  return (m ? m[1] : 'es') as Idioma;
}

/** La misma ruta sin el prefijo de idioma (/en/catalogo → /catalogo). */
export const sinIdioma = (p: string) => p.replace(PREFIJO, '') || '/';

/** Ruta interna en un idioma: ruta('en', '/catalogo') → /en/catalogo. Los enlaces externos no se tocan. */
export function ruta(l: Idioma, p: string): string {
  if (l === 'es' || !p.startsWith('/') || p.startsWith('//')) return p;
  if (p === '/' || p.startsWith('/#') || p.startsWith('/?')) return `/${l}${p.slice(1)}`; // / → /en, /#x → /en#x
  return `/${l}${p}`;
}

/** Elige el texto del idioma: const t = traductor(l); t('Catálogo', 'Catalogue', 'Catalogue'). */
export const traductor = (l: Idioma) => (es: string, en: string, fr: string) => (l === 'en' ? en : l === 'fr' ? fr : es);

/** En el navegador: idioma de la página actual (lo pone Base.astro en <html lang>). */
export function idiomaDocumento(): Idioma {
  const l = typeof document !== 'undefined' ? document.documentElement.lang : 'es';
  return l === 'en' || l === 'fr' ? l : 'es';
}

/** Formato de euros del idioma (20 € / €20 / 20 €). */
export function formatoEuros(l: Idioma) {
  const f = new Intl.NumberFormat(LOCALE[l], { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (n: number) => f.format(n);
}

export { huella, huellaProducto } from './huella.js';
