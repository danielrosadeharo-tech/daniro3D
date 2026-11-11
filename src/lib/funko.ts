// Reglas y dibujo del Funko personalizado (misma guía de precios que el catálogo en PDF).
// Se usa en el servidor (Astro) y en el navegador (configurador en vivo).

export const FUNKO = {
  base: 55, // caja + 1 Funko normal
  normalExtra: 30, // cada Funko normal añadido
  pequeno: 20, // cada Funko pequeño
  /** Máximo de pequeños según los normales: 1 normal + 3 pequeños, o 2 normales + 1 pequeño. */
  maxPequenos: (normales: number) => (normales >= 2 ? 1 : 3),
  maxNormales: 2,
};

export const precioFunko = (n: number, s: number) => FUNKO.base + (n - 1) * FUNKO.normalExtra + s * FUNKO.pequeno;

export function resumenFunko(n: number, s: number) {
  const partes = [`${n} ${n === 1 ? 'normal' : 'normales'}`];
  if (s) partes.push(`${s} ${s === 1 ? 'pequeño' : 'pequeños'}`);
  return `Caja + ${partes.join(' + ')}`;
}

/** Lee "Caja + 1 normal + 3 pequeños" → { n: 1, s: 3 } (null si no es una composición válida). */
export function leerComposicion(txt?: string | null): { n: number; s: number } | null {
  if (!txt) return null;
  const n = Number(/(\d+)\s+normal/i.exec(txt)?.[1] ?? 0);
  const s = Number(/(\d+)\s+peque/i.exec(txt)?.[1] ?? 0);
  if (n < 1 || n > FUNKO.maxNormales || s > FUNKO.maxPequenos(n)) return null;
  return { n, s };
}

// ---- Dibujo ----------------------------------------------------------------
const W = { normal: 40, pequeno: 25 };
const H = { normal: 52, pequeno: 52 * 0.625 }; // la pequeña es la normal a escala 0,625

/** Silueta de Funko: cabeza grande con dos ojos, brazos, cuerpo y pies. Origen arriba a la izquierda. */
function figura(x: number, y: number, tipo: 'normal' | 'pequeno', extra = '') {
  const k = tipo === 'normal' ? 1 : 0.625;
  // La animación de entrada va en un grupo aparte: si tocara el mismo <g> que lleva translate/scale,
  // cambiaría el origen de la escala y las figuras pequeñas se quedarían descolocadas.
  return `<g class="${extra}"><g class="fk-fig" transform="translate(${x} ${y}) scale(${k})">
    <rect x="0" y="0" width="40" height="32" rx="8"/>
    <rect x="6" y="31" width="28" height="7" rx="3.5"/>
    <rect x="10" y="31" width="20" height="13" rx="3"/>
    <rect x="10" y="42" width="8.5" height="10" rx="2"/><rect x="21.5" y="42" width="8.5" height="10" rx="2"/>
    <circle class="fk-eye" cx="13" cy="15" r="3.2"/><circle class="fk-eye" cx="27" cy="15" r="3.2"/>
  </g></g>`;
}

export function svgFigura(tipo: 'normal' | 'pequeno', titulo: string) {
  return `<svg class="fk-svg" viewBox="-4 -4 48 60" role="img" aria-label="${titulo}">${figura(tipo === 'normal' ? 0 : 7.5, tipo === 'normal' ? 0 : 20, tipo)}</svg>`;
}

/**
 * Caja con sus figuras (los normales primero). La caja se ensancha con cada figura, como en la realidad.
 * `nuevas` marca cuántas figuras del final acaban de entrar (para animarlas).
 */
export function svgCaja(n: number, s: number, opts: { titulo?: string; nuevasN?: number; nuevasS?: number } = {}) {
  const figs: ('normal' | 'pequeno')[] = [...Array(n).fill('normal'), ...Array(s).fill('pequeno')];
  const gap = 14, pad = 22, marco = 14, arriba = 26, abajo = 22;
  const contenido = figs.reduce((a, f) => a + W[f], 0) + Math.max(0, figs.length - 1) * gap;
  const innerW = Math.max(96, contenido + pad * 2);
  const innerH = 84;
  const total = innerW + marco * 2;
  const alto = arriba + innerH + abajo;
  const suelo = arriba + innerH - 10;
  let x = marco + (innerW - contenido) / 2;
  const nuevasN = opts.nuevasN ?? 0, nuevasS = opts.nuevasS ?? 0;
  const dibujos = figs.map((f, i) => {
    const esNueva = f === 'normal' ? i >= n - nuevasN : i - n >= s - nuevasS;
    const g = figura(x, suelo - H[f], f, esNueva ? 'fk-new' : '');
    x += W[f] + gap;
    return g;
  }).join('');
  const titulo = opts.titulo ?? (figs.length ? `${resumenFunko(n, s)}` : 'Caja a medida');
  return `<svg class="fk-svg fk-caja" viewBox="0 0 ${total} ${alto}" width="${total}" height="${alto}" role="img" aria-label="${titulo}">
    <rect class="fk-marco" x="0" y="0" width="${total}" height="${alto}" rx="7"/>
    <rect class="fk-claro" x="${marco - 2}" y="8" width="44" height="9" rx="2"/>
    <rect class="fk-ventana" x="${marco}" y="${arriba}" width="${innerW}" height="${innerH}" rx="2"/>
    <rect class="fk-claro" x="${marco}" y="${arriba + innerH + 6}" width="${innerW}" height="8" rx="1.5"/>
    ${dibujos}
  </svg>`;
}

/** Todas las composiciones válidas (1 normal + 0-3 pequeños, 2 normales + 0-1 pequeño). */
export const composiciones = (): { n: number; s: number }[] =>
  Array.from({ length: FUNKO.maxNormales }, (_, i) => i + 1)
    .flatMap((n) => Array.from({ length: FUNKO.maxPequenos(n) + 1 }, (_, s) => ({ n, s })));

/** Página de cada composición (/funkos/caja-1-2): es la que va en el pedido y la que enseña WhatsApp. */
export const urlCaja = (n: number, s: number) => `/funkos/caja-${n}-${s}`;
/** Dibujo de la caja en PNG: grande para la vista previa de los enlaces, mini para la cesta. */
export const imagenCaja = (n: number, s: number, mini = false) => `/funkos/caja-${n}-${s}${mini ? '-mini' : ''}.png`;
