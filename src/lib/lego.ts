// Dibujo del Lego personalizado: dos figuras de bloques (30 cm y 15 cm) a escala.
// En la ficha se resalta la del tamaño elegido (data-sel="grande" | "peque" en el <svg>).

export type FiguraLego = 'grande' | 'peque';

/** "15 cm" → peque; cualquier otro tamaño → grande. */
export const figuraDeTalla = (nombre: string): FiguraLego => (/\b15\b/.test(nombre) ? 'peque' : 'grande');

/** Figura de bloques de 100 de alto, centrada en x = 0 y con los pies en y = 100. */
function figura(cx: number, pie: number, k: number) {
  return `<g transform="translate(${cx} ${pie - 100 * k}) scale(${k})">
    <rect x="-7" y="0" width="14" height="6.5" rx="1.6"/>
    <rect x="-13" y="5" width="26" height="22" rx="6"/>
    <circle class="lg-hueco" cx="-5" cy="15" r="2.3"/><circle class="lg-hueco" cx="5" cy="15" r="2.3"/>
    <path class="lg-boca" d="M-6 19.6 Q0 24.2 6 19.6"/>
    <rect x="-6" y="25" width="12" height="5" rx="1"/>
    <path class="lg-torso" d="M-15.5 29 H15.5 L20.5 57 H-20.5 Z"/>
    <g transform="translate(-17.5 30.5) rotate(13)"><rect x="-5" y="0" width="10" height="21" rx="5"/></g>
    <g transform="translate(17.5 30.5) rotate(-13)"><rect x="-5" y="0" width="10" height="21" rx="5"/></g>
    <circle cx="-23.6" cy="53.5" r="5.2"/><circle class="lg-hueco" cx="-23.6" cy="54.6" r="2.3"/>
    <circle cx="23.6" cy="53.5" r="5.2"/><circle class="lg-hueco" cx="23.6" cy="54.6" r="2.3"/>
    <rect x="-21" y="57.5" width="42" height="6" rx="1.2"/>
    <rect x="-21" y="63" width="20" height="37" rx="2.2"/><rect x="1" y="63" width="20" height="37" rx="2.2"/>
  </g>`;
}

/** Regla vertical con su medida al lado de una figura. */
export function regla(x: number, arriba: number, abajo: number, texto: string) {
  return `<g class="lg-regla">
    <path d="M${x} ${arriba} V${abajo} M${x - 12} ${arriba} H${x + 12} M${x - 12} ${abajo} H${x + 12}"/>
    <text x="${x}" y="${arriba - 22}" text-anchor="middle">${texto}</text>
  </g>`;
}

/** SVG recortado a las dos figuras (se centra en su hueco); `sel` marca la que se resalta al principio. */
export function svgLegos(sel: FiguraLego | 'ambas', titulo: string) {
  const pie = 770, kG = 4.6, kP = 2.3;
  return `<svg class="lg" viewBox="40 150 740 700" role="img" aria-label="${titulo}" data-sel="${sel}">
    <rect class="lg-suelo" x="90" y="${pie}" width="620" height="12" rx="6"/>
    <g class="lg-fig lg-fig--grande">${figura(330, pie, kG)}${regla(150, pie - 100 * kG, pie, '30 cm')}</g>
    <g class="lg-fig lg-fig--peque">${figura(590, pie, kP)}${regla(700, pie - 100 * kP, pie, '15 cm')}</g>
  </svg>`;
}
