import sitio from '../../data/sitio.json';
import type { MetodoPedido, Pedido } from './tipos';
import { textoPedido } from './mensaje';

const origen = () => (typeof location !== 'undefined' ? location.origin : sitio.dominio);

const whatsapp: MetodoPedido = {
  id: 'whatsapp',
  etiqueta: 'Enviar por WhatsApp',
  descripcion: 'Se abre WhatsApp con el pedido escrito. Te confirmamos precio final, envío y plazo por ahí.',
  disponible: () => Boolean(sitio.whatsapp),
  cobraEnLinea: false,
  async enviar(p: Pedido) {
    const url = `https://wa.me/${sitio.whatsapp}?text=${encodeURIComponent(textoPedido(p, origen()))}`;
    return { ok: true, mensaje: 'Abrimos WhatsApp con tu pedido. Solo falta pulsar enviar.', redirigirA: url };
  },
};

const email: MetodoPedido = {
  id: 'email',
  etiqueta: 'Enviar por email',
  descripcion: 'Se abre tu programa de correo con el pedido escrito.',
  disponible: () => Boolean(sitio.email),
  cobraEnLinea: false,
  async enviar(p: Pedido) {
    const asunto = `Pedido de ${p.cliente.nombre} · ${sitio.marca}`;
    const url = `mailto:${sitio.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(textoPedido(p, origen()))}`;
    return { ok: true, mensaje: 'Abrimos tu correo con el pedido. Solo falta enviarlo.', redirigirA: url };
  },
};

/*
 * Pasarela de pago (pendiente). Ejemplo de cómo encajaría:
 *
 * const pasarela: MetodoPedido = {
 *   id: 'tarjeta', etiqueta: 'Pagar con tarjeta', descripcion: 'Pago seguro con tarjeta.',
 *   disponible: () => true, cobraEnLinea: true,
 *   async enviar(p) {
 *     const r = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify(p) }); // necesita un servidor o función
 *     const { url } = await r.json();
 *     return { ok: true, mensaje: 'Te llevamos al pago…', redirigirA: url };
 *   },
 * };
 */

export const metodos: MetodoPedido[] = [whatsapp, email];
export const metodosDisponibles = () => metodos.filter((m) => m.disponible());
export type { MetodoPedido, Pedido, Linea, Cliente, ResultadoPedido } from './tipos';
