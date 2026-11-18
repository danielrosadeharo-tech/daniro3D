// Enlaces de MakerWorld (makerworld.com, la web de modelos 3D de Bambu Lab).
// Un modelo tiene esta forma: https://makerworld.com/es/models/2790106-sleeping-baby-dragon?from=search

/** Busca un enlace de modelo dentro de lo que pega el cliente (vale el texto entero de "Compartir" de la app). */
export function leerEnlaceMakerWorld(texto: string): { url: string; id: string; nombre: string } | null {
  const m = /https?:\/\/(?:www\.)?makerworld\.com(?:\.cn)?\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?models\/(\d+)(?:-([\w-]+))?[^\s]*/i.exec(texto);
  if (!m) return null;
  const [, id, slug = ''] = m;
  const lengua = /makerworld\.com(?:\.cn)?\/([a-z]{2}(?:-[a-z]{2})?)\/models/i.exec(m[0])?.[1] ?? 'en';
  // Enlace limpio, sin "?from=search" ni anclas
  const url = `https://makerworld.com/${lengua}/models/${id}${slug ? `-${slug}` : ''}`;
  const nombre = slug.replace(/-/g, ' ').trim();
  return { url, id, nombre };
}

/** ¿Es un enlace de MakerWorld, aunque no sea de un modelo? (para avisar de que hace falta el del modelo). */
export const esDeMakerWorld = (texto: string) => /makerworld\.com/i.test(texto);

/** Búsqueda en MakerWorld en el idioma de la página. */
export const buscarEnMakerWorld = (q: string, l: 'es' | 'en' | 'fr') =>
  `https://makerworld.com/${l}/search/models?keyword=${encodeURIComponent(q.trim())}`;
