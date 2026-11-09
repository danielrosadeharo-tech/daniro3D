import type { Pedido } from './tipos';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const euros = (n: number) => eur.format(n);

/** Texto plano del pedido, igual para WhatsApp y para email. */
export function textoPedido(p: Pedido, origen: string): string {
  const l: string[] = ['¡Hola! Quiero hacer este pedido:', ''];
  p.lineas.forEach((x, i) => {
    const ops = Object.entries(x.opciones).map(([k, v]) => `${k}: ${v}`).join(' · ');
    const precio = x.precio == null ? 'precio a consultar' : `${euros(x.precio * x.cantidad)}`;
    l.push(`${i + 1}. ${x.nombre} × ${x.cantidad} (${precio})`);
    if (ops) l.push(`   ${ops}`);
    if (x.personalizacion) l.push(`   Personalización: ${x.personalizacion}`);
    l.push(`   ${origen}${x.url}`);
  });
  l.push('');
  l.push(p.hayConsultas ? `Total de lo que tiene precio: ${euros(p.total)} (más lo que esté a consultar)` : `Total: ${euros(p.total)}`);
  l.push('', `Nombre: ${p.cliente.nombre}`);
  if (p.cliente.telefono) l.push(`Teléfono: ${p.cliente.telefono}`);
  if (p.cliente.email) l.push(`Email: ${p.cliente.email}`);
  if (p.cliente.notas) l.push(`Notas: ${p.cliente.notas}`);
  return l.join('\n');
}
