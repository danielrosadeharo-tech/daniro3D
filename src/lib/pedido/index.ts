import sitio from '../../data/sitio.json';
import type { MetodoPedido, Pedido } from './tipos';
import { textoPedido } from './mensaje';
import { idiomaDocumento, traductor, type Idioma } from '../../i18n';

const origen = () => (typeof location !== 'undefined' ? location.origin : sitio.dominio);

/** Nombre y explicación de cada forma de enviar el pedido, en el idioma de la página. */
export function textosMetodo(id: string, l: Idioma): { etiqueta: string; descripcion: string } {
  const t = traductor(l);
  if (id === 'email') {
    return {
      etiqueta: t('Enviar por email', 'Send by email', 'Envoyer par e-mail'),
      descripcion: t('Se abre tu programa de correo con el pedido escrito.', 'Your email app opens with the order already written.', "Votre messagerie s'ouvre avec la commande déjà rédigée."),
    };
  }
  return {
    etiqueta: t('Enviar por WhatsApp', 'Send on WhatsApp', 'Envoyer sur WhatsApp'),
    descripcion: t(
      'Se abre WhatsApp con el pedido escrito. Te confirmamos precio final, envío y plazo por ahí.',
      'WhatsApp opens with the order already written. We confirm the final price, shipping and lead time there.',
      "WhatsApp s'ouvre avec la commande déjà rédigée. Nous vous y confirmons le prix final, la livraison et le délai.",
    ),
  };
}

const whatsapp: MetodoPedido = {
  id: 'whatsapp',
  etiqueta: 'Enviar por WhatsApp',
  descripcion: 'Se abre WhatsApp con el pedido escrito. Te confirmamos precio final, envío y plazo por ahí.',
  disponible: () => Boolean(sitio.whatsapp),
  cobraEnLinea: false,
  async enviar(p: Pedido) {
    const l = idiomaDocumento();
    const t = traductor(l);
    const url = `https://wa.me/${sitio.whatsapp}?text=${encodeURIComponent(textoPedido(p, origen(), l))}`;
    return {
      ok: true,
      mensaje: t('Abrimos WhatsApp con tu pedido. Solo falta pulsar enviar.', 'We have opened WhatsApp with your order. Just tap send.', "Nous avons ouvert WhatsApp avec votre commande. Il ne reste qu'à appuyer sur envoyer."),
      redirigirA: url,
    };
  },
};

const email: MetodoPedido = {
  id: 'email',
  etiqueta: 'Enviar por email',
  descripcion: 'Se abre tu programa de correo con el pedido escrito.',
  disponible: () => Boolean(sitio.email),
  cobraEnLinea: false,
  async enviar(p: Pedido) {
    const l = idiomaDocumento();
    const t = traductor(l);
    const asunto = `${t('Pedido de', 'Order from', 'Commande de')} ${p.cliente.nombre} · ${sitio.marca}`;
    const url = `mailto:${sitio.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(textoPedido(p, origen(), l))}`;
    return {
      ok: true,
      mensaje: t('Abrimos tu correo con el pedido. Solo falta enviarlo.', 'We have opened your email with the order. Just send it.', "Nous avons ouvert votre messagerie avec la commande. Il ne reste qu'à l'envoyer."),
      redirigirA: url,
    };
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
