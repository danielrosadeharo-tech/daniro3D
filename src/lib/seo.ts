import { sitio, textoPrecio, urlProducto, type Producto } from './catalogo';

const abs = (path: string) => new URL(path, sitio.dominio).toString();

export function migasLd(items: { nombre: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nombre, ...(it.url ? { item: abs(it.url) } : {}) })),
  };
}

export function listaLd(nombre: string, ps: Producto[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: nombre,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: ps.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(urlProducto(p)), name: p.nombre })),
    },
  };
}

export function productoLd(p: Producto, imagenes: string[]) {
  const pr = p.precio;
  const base = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nombre,
    description: p.descripcionLarga,
    image: imagenes.map(abs),
    sku: p.slug,
    brand: { '@type': 'Brand', name: sitio.marca },
    material: p.materiales.join(', '),
    ...(p.colores.length && p.colores[0] !== 'A elegir' ? { color: p.colores.join(', ') } : {}),
  };
  if (pr.tipo === 'consultar') return base;
  const precios = [pr.importe, ...p.variantes.map((v) => v.precio).filter((n): n is number => n != null)];
  const vendedor = { '@type': 'Organization', name: sitio.marca };
  const offers = precios.length > 1 || pr.tipo === 'desde'
    ? { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: Math.min(...precios), highPrice: Math.max(...precios), offerCount: precios.length, availability: 'https://schema.org/MadeToOrder', seller: vendedor }
    : { '@type': 'Offer', priceCurrency: 'EUR', price: pr.importe, availability: 'https://schema.org/MadeToOrder', url: abs(urlProducto(p)), seller: vendedor, itemCondition: 'https://schema.org/NewCondition' };
  return { ...base, offers };
}

export const descripcionMeta = (p: Producto) => `${p.nombre}. ${p.descripcionCorta} ${textoPrecio(p)}. Impreso en 3D por ${sitio.marca}.`.slice(0, 158);
