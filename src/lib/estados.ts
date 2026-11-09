// Estados de pedidos y encargos (los mismos que admiten las reglas de Firestore).
export const ESTADOS = [
  { id: 'nuevo', txt: 'Recibido' },
  { id: 'confirmado', txt: 'Confirmado' },
  { id: 'fabricando', txt: 'En fabricación' },
  { id: 'enviado', txt: 'Enviado' },
  { id: 'entregado', txt: 'Entregado' },
  { id: 'cancelado', txt: 'Cancelado' },
] as const;
export type Estado = (typeof ESTADOS)[number]['id'];
export const textoEstado = (id: string) => ESTADOS.find((e) => e.id === id)?.txt ?? id;

const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
/** Fecha de un Timestamp de Firestore (o "ahora mismo" si aún no ha llegado del servidor). */
export const textoFecha = (t: { toDate?: () => Date } | null | undefined) => (t?.toDate ? fecha.format(t.toDate()) : 'Ahora mismo');

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
