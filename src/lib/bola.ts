// Dibujo de la Bola de Navidad personalizada: bola con anilla, un marco con "tu foto" y lunares alrededor.
// data-luz="on" la enseña encendida (luz cálida) y "off" apagada (blanca); los colores van en el propio SVG.

let n = 0;

/** Estrella de cinco puntas centrada en (cx, cy). */
function estrella(cx: number, cy: number, r: number, clase: string) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `<polygon class="${clase}" points="${pts.join(' ')}"/>`;
}

export function svgBola(encendida: boolean, titulo: string) {
  const id = `bola-halo-${++n}`;
  const cx = 200, cy = 262, r = 140;
  // Lunares a los lados del marco y estrellas en la franja de arriba
  const lunares = [-1, 1].flatMap((lado) => Array.from({ length: 7 }, (_, i) => {
    const y = 192 + i * 22, x = cx + lado * (86 + 10 * Math.sin((i / 6) * Math.PI));
    return `<circle class="bola-luz" cx="${x.toFixed(1)}" cy="${y}" r="4.5"/>`;
  })).join('');
  const estrellas = [-54, -27, 0, 27, 54].map((dx) => estrella(cx + dx, 152 + Math.abs(dx) * 0.12, 7, 'bola-luz')).join('');
  return `<svg class="bola" viewBox="0 30 400 450" role="img" aria-label="${titulo}" data-luz="${encendida ? 'on' : 'off'}">
    <style>
      .bola .bola-halo { opacity: 0; transition: opacity 450ms ease; }
      .bola[data-luz="on"] .bola-halo { opacity: 1; }
      .bola .bola-cuerpo { fill: #f4efe6; transition: fill 450ms ease; }
      .bola[data-luz="on"] .bola-cuerpo { fill: #f7cf7a; }
      .bola .bola-marco { fill: #e9e2d6; stroke: #d8cfc1; stroke-width: 3; transition: fill 450ms ease, stroke 450ms ease; }
      .bola[data-luz="on"] .bola-marco { fill: #fde9b8; stroke: #e9b257; }
      .bola .bola-foto { fill: #d6ccbd; transition: fill 450ms ease; }
      .bola[data-luz="on"] .bola-foto { fill: #dc9a3e; }
      .bola .bola-luz { fill: #ddd4c6; transition: fill 450ms ease; }
      .bola[data-luz="on"] .bola-luz { fill: #fff6dd; }
      .bola .bola-anilla { fill: none; stroke: #f4efe6; stroke-width: 9; }
      .bola .bola-tapa { fill: #f4efe6; }
    </style>
    <defs>
      <radialGradient id="${id}">
        <stop offset="0" stop-color="#ffd27a" stop-opacity="0.75"/>
        <stop offset="0.55" stop-color="#f5a93c" stop-opacity="0.25"/>
        <stop offset="1" stop-color="#f5a93c" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle class="bola-halo" cx="${cx}" cy="${cy}" r="${r + 60}" fill="url(#${id})"/>
    <circle class="bola-anilla" cx="${cx}" cy="86" r="17"/>
    <rect class="bola-tapa" x="${cx - 26}" y="104" width="52" height="24" rx="6"/>
    <circle class="bola-cuerpo" cx="${cx}" cy="${cy}" r="${r}"/>
    ${estrellas}
    <rect class="bola-marco" x="${cx - 66}" y="178" width="132" height="160" rx="18"/>
    <circle class="bola-foto" cx="${cx + 26}" cy="216" r="13"/>
    <path class="bola-foto" d="M${cx - 52} 322 L${cx - 16} 262 L${cx + 6} 292 L${cx + 24} 270 L${cx + 52} 322 Z"/>
    ${lunares}
  </svg>`;
}
