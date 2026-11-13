// Cesta guardada en el navegador (localStorage). Sin servidor.
import type { Linea } from '../lib/pedido/tipos';
import { idiomaDocumento, traductor, formatoEuros, ruta } from '../i18n';

const CLAVE = 'daniro3d:cesta:v1';
// Idioma de la página (en, fr o es): textos de la cesta, formato de euros y enlaces a las fichas
const idioma = idiomaDocumento();
const tr = traductor(idioma);

function leer(): Linea[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function guardar(ls: Linea[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(ls)); } catch { /* modo privado: la cesta vive solo en esta página */ }
  memoria = ls;
  document.dispatchEvent(new CustomEvent('cesta:cambio', { detail: ls }));
}
let memoria: Linea[] | null = null;

export const cesta = {
  lineas: (): Linea[] => memoria ?? (memoria = leer()),
  unidades: () => cesta.lineas().reduce((n, l) => n + l.cantidad, 0),
  total: () => cesta.lineas().reduce((n, l) => n + (l.precio ?? 0) * l.cantidad, 0),
  hayConsultas: () => cesta.lineas().some((l) => l.precio == null),
  añadir(l: Omit<Linea, 'id' | 'cantidad'>, cantidad = 1) {
    const id = [l.slug, JSON.stringify(l.opciones), l.personalizacion ?? ''].join('|');
    const ls = [...cesta.lineas()];
    const i = ls.findIndex((x) => x.id === id);
    if (i >= 0) ls[i] = { ...ls[i], cantidad: Math.min(99, ls[i].cantidad + cantidad) };
    else ls.push({ ...l, id, cantidad });
    guardar(ls);
  },
  cantidad(id: string, n: number) {
    const ls = cesta.lineas().map((l) => (l.id === id ? { ...l, cantidad: Math.max(1, Math.min(99, n)) } : l));
    guardar(ls);
  },
  quitar(id: string) { guardar(cesta.lineas().filter((l) => l.id !== id)); },
  vaciar() { guardar([]); },
};

export const euros = formatoEuros(idioma);

// Sincroniza entre pestañas
addEventListener('storage', (e) => {
  if (e.key === CLAVE) { memoria = null; document.dispatchEvent(new CustomEvent('cesta:cambio', { detail: cesta.lineas() })); }
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const svg = (d: string) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">${d}</svg>`;

/** HTML de las líneas, compartido por el cajón y la página /cesta. */
export function htmlLineas(ls: Linea[]): string {
  return ls.map((l) => {
    const ops = Object.entries(l.opciones).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ');
    const precio = l.precio == null ? tr('A consultar', 'On request', 'Sur demande') : euros(l.precio * l.cantidad);
    return `<li class="linea" data-id="${esc(l.id)}">
      <img src="${esc(l.imagen)}" alt="" width="72" height="96" loading="lazy">
      <div>
        <div class="linea__top"><a class="linea__nombre" href="${esc(ruta(idioma, l.url))}">${esc(l.nombre)}</a><span class="precio">${precio}</span></div>
        ${ops ? `<p class="linea__meta">${ops}</p>` : ''}
        ${l.personalizacion ? `<p class="linea__meta">${tr('Personalización', 'Personalisation', 'Personnalisation')}: ${esc(l.personalizacion)}</p>` : ''}
        <div class="linea__acciones">
          <div class="qty" role="group" aria-label="${tr('Cantidad de', 'Quantity of', 'Quantité de')} ${esc(l.nombre)}">
            <button type="button" data-accion="menos" aria-label="${tr('Quitar una unidad', 'Remove one', 'Retirer une unité')}" ${l.cantidad <= 1 ? 'disabled' : ''}>${svg('<path d="M5 12h14"/>')}</button>
            <output aria-live="polite">${l.cantidad}</output>
            <button type="button" data-accion="mas" aria-label="${tr('Añadir una unidad', 'Add one', 'Ajouter une unité')}">${svg('<path d="M12 5v14M5 12h14"/>')}</button>
          </div>
          <button type="button" class="quitar" data-accion="quitar">${tr('Quitar', 'Remove', 'Retirer')}</button>
        </div>
      </div>
    </li>`;
  }).join('');
}

/** Delegación de eventos para + / − / quitar dentro de una lista. */
export function conectarLista(ul: HTMLElement) {
  ul.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-accion]');
    const li = b?.closest<HTMLElement>('.linea');
    if (!b || !li) return;
    const l = cesta.lineas().find((x) => x.id === li.dataset.id);
    if (!l) return;
    if (b.dataset.accion === 'mas') cesta.cantidad(l.id, l.cantidad + 1);
    if (b.dataset.accion === 'menos') cesta.cantidad(l.id, l.cantidad - 1);
    if (b.dataset.accion === 'quitar') {
      cesta.quitar(l.id);
      avisar(tr(`${l.nombre} quitado de la cesta`, `${l.nombre} removed from the basket`, `${l.nombre} retiré du panier`), tr('Deshacer', 'Undo', 'Annuler'), () => cesta.añadir(l, l.cantidad));
      return;
    }
    // Mantén el foco en el mismo botón tras re-pintar
    requestAnimationFrame(() => ul.querySelector<HTMLButtonElement>(`.linea[data-id="${CSS.escape(l.id)}"] button[data-accion="${b.dataset.accion}"]`)?.focus());
  });
}

let t = 0;
export function avisar(texto: string, accion?: string, alPulsar?: () => void) {
  const el = document.getElementById('toast');
  if (!el) return;
  const msg = el.querySelector('[data-msg]')!;
  const btn = el.querySelector('button')!;
  msg.textContent = texto;
  btn.hidden = !accion;
  if (accion) {
    btn.textContent = accion;
    btn.onclick = () => { alPulsar?.(); el.removeAttribute('data-show'); };
  }
  el.setAttribute('data-show', '');
  clearTimeout(t);
  t = window.setTimeout(() => el.removeAttribute('data-show'), 4000);
}
