// Huella de los textos en español de un producto. Si cambia (porque se editó en el panel),
// su traducción ya no vale y el build la vuelve a hacer. La usan la web (Astro) y scripts/traducir.mjs.

/** FNV-1a de 32 bits en base 36: corta y suficiente para detectar cambios. */
export function huella(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/** Los textos de un producto que se traducen uno a uno (el resto va por el vocabulario común). */
export const huellaProducto = (p) =>
  huella(JSON.stringify([p.nombre, p.descripcionCorta, p.descripcionLarga, (p.galeria ?? []).map((g) => g.alt)]));
