// Estados de pedidos y encargos (los mismos que admiten las reglas de Firestore).
import { LOCALE, traductor, type Idioma } from '../i18n';

export const ESTADOS = [
  { id: 'nuevo', txt: 'Recibido' },
  { id: 'confirmado', txt: 'Confirmado' },
  { id: 'fabricando', txt: 'En fabricación' },
  { id: 'enviado', txt: 'Enviado' },
  { id: 'entregado', txt: 'Entregado' },
  { id: 'cancelado', txt: 'Cancelado' },
] as const;
export type Estado = (typeof ESTADOS)[number]['id'];

/** Nombre del estado en otros idiomas (el panel lo enseña siempre en español). */
const TRAD_ESTADO: Record<string, { en: string; fr: string }> = {
  nuevo: { en: 'Received', fr: 'Reçue' },
  confirmado: { en: 'Confirmed', fr: 'Confirmée' },
  fabricando: { en: 'In production', fr: 'En fabrication' },
  enviado: { en: 'Shipped', fr: 'Expédiée' },
  entregado: { en: 'Delivered', fr: 'Livrée' },
  cancelado: { en: 'Cancelled', fr: 'Annulée' },
};
export const textoEstado = (id: string, l: Idioma = 'es') =>
  l === 'es' ? ESTADOS.find((e) => e.id === id)?.txt ?? id : TRAD_ESTADO[id]?.[l] ?? id;

/** Fecha de un Timestamp de Firestore (o "ahora mismo" si aún no ha llegado del servidor). */
export function textoFecha(t: { toDate?: () => Date } | null | undefined, l: Idioma = 'es') {
  if (!t?.toDate) return traductor(l)('Ahora mismo', 'Just now', "À l'instant");
  return new Intl.DateTimeFormat(LOCALE[l], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(t.toDate());
}

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Línea personalizada: el Funko a medida o cualquier pieza con texto de personalización. Va a "encargos". */
export const lineaPersonalizada = (l: { slug?: string; personalizacion?: string | null }) =>
  l.slug === 'funko-personalizado' || Boolean(l.personalizacion);

/** Paso del estado en el camino del pedido (para la barra de progreso del cliente). */
export const pasoEstado = (id: string) => ['nuevo', 'confirmado', 'fabricando', 'enviado', 'entregado'].indexOf(id);
