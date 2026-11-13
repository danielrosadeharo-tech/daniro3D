import type { Pedido } from './tipos';
import { traductor, formatoEuros, type Idioma } from '../../i18n';

/** Texto plano del pedido, igual para WhatsApp y para email, en el idioma en que pidió el cliente. */
export function textoPedido(p: Pedido, origen: string, l: Idioma = 'es'): string {
  const t = traductor(l);
  const euros = formatoEuros(l);
  const l1 = p.referencia
    ? t(`¡Hola! Quiero hacer este pedido (ref. ${p.referencia}):`, `Hi! I'd like to place this order (ref. ${p.referencia}):`, `Bonjour ! Je voudrais passer cette commande (réf. ${p.referencia}) :`)
    : t('¡Hola! Quiero hacer este pedido:', "Hi! I'd like to place this order:", 'Bonjour ! Je voudrais passer cette commande :');
  const lineas: string[] = [l1, ''];
  p.lineas.forEach((x, i) => {
    const ops = Object.entries(x.opciones).map(([k, v]) => `${k}: ${v}`).join(' · ');
    const precio = x.precio == null ? t('precio a consultar', 'price on request', 'prix sur demande') : `${euros(x.precio * x.cantidad)}`;
    lineas.push(`${i + 1}. ${x.nombre} × ${x.cantidad} (${precio})`);
    if (ops) lineas.push(`   ${ops}`);
    if (x.personalizacion) lineas.push(`   ${t('Personalización', 'Personalisation', 'Personnalisation')}: ${x.personalizacion}`);
    lineas.push(`   ${origen}${x.url}`);
  });
  lineas.push('');
  lineas.push(p.hayConsultas
    ? t(`Total de lo que tiene precio: ${euros(p.total)} (más lo que esté a consultar)`, `Total for priced items: ${euros(p.total)} (plus any price-on-request items)`, `Total des articles avec prix : ${euros(p.total)} (plus les articles sur demande)`)
    : `Total: ${euros(p.total)}`);
  lineas.push('', `${t('Nombre', 'Name', 'Nom')}: ${p.cliente.nombre}`);
  if (p.cliente.telefono) lineas.push(`${t('Teléfono', 'Phone', 'Téléphone')}: ${p.cliente.telefono}`);
  if (p.cliente.email) lineas.push(`Email: ${p.cliente.email}`);
  if (p.cliente.notas) lineas.push(`${t('Notas', 'Notes', 'Remarques')}: ${p.cliente.notas}`);
  return lineas.join('\n');
}
