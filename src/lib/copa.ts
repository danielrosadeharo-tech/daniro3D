// Dibujo de la Copa personalizada: dos copas (30 cm y 20 cm) a escala, como el del Lego personalizado.
// En la ficha se resalta la del tamaño elegido (data-sel="grande" | "peque" en el <svg>).
import { regla, type FiguraLego } from './lego';

/** "20 cm" → peque; cualquier otro tamaño → grande. */
export const figuraDeTallaCopa = (nombre: string): FiguraLego => (/\b20\b/.test(nombre) ? 'peque' : 'grande');

/** Estrella de cinco puntas centrada en (cx, cy). */
function estrella(cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `<polygon class="lg-hueco" points="${pts.join(' ')}"/>`;
}

/** Copa de 100 de alto, centrada en x = 0 y apoyada en y = 100: boca, asas, pie y peana con su placa. */
function copa(cx: number, pie: number, k: number) {
  return `<g transform="translate(${cx} ${pie - 100 * k}) scale(${k})">
    <path class="lg-asa" d="M-23 11 C-40 9 -41 34 -13 41"/><path class="lg-asa" d="M23 11 C40 9 41 34 13 41"/>
    <rect x="-28" y="0" width="56" height="6" rx="2"/>
    <path d="M-26 5 H26 C26 30 18 44 6 50 V55 H-6 V50 C-18 44 -26 30 -26 5 Z"/>
    ${estrella(0, 24, 8)}
    <path d="M-5 54 H5 L7.5 68 H-7.5 Z"/>
    <rect x="-11" y="66" width="22" height="5" rx="2.5"/>
    <path d="M-13 70 H13 L17 82 H-17 Z"/>
    <rect x="-23" y="81" width="46" height="19" rx="2"/>
    <rect class="lg-hueco" x="-13" y="86.5" width="26" height="8" rx="1.5"/>
  </g>`;
}

/** SVG recortado a las dos copas; `sel` marca la que se resalta al principio. */
export function svgCopas(sel: FiguraLego | 'ambas', titulo: string) {
  const pie = 770, kG = 4.1, kP = kG * (20 / 30);
  return `<svg class="lg" viewBox="40 150 740 700" role="img" aria-label="${titulo}" data-sel="${sel}">
    <rect class="lg-suelo" x="90" y="${pie}" width="620" height="12" rx="6"/>
    <g class="lg-fig lg-fig--grande">${copa(305, pie, kG)}${regla(105, pie - 100 * kG, pie, '30 cm')}</g>
    <g class="lg-fig lg-fig--peque">${copa(590, pie, kP)}${regla(735, pie - 100 * kP, pie, '20 cm')}</g>
  </svg>`;
}
