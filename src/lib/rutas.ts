// Rutas de las páginas con parámetros. Las usan las páginas en español y sus copias en /en y /fr
// (src/pages/en, src/pages/fr), que importan la página española y le pasan los mismos props.
import { productos, categoriasCatalogo } from './catalogo';
import { composiciones } from './funko';

/** /producto/<slug>: los productos con página propia (el Funko personalizado vive en /funkos) no tienen ficha. */
export const rutasProducto = () => productos.filter((p) => !p.enlace).map((p) => ({ params: { slug: p.slug }, props: { p } }));

/** /catalogo/<categoria>: las categorías con página propia (Funkos → /funkos) no generan /catalogo/<slug>. */
export const rutasCategoria = () => categoriasCatalogo.filter((c) => !c.enlace).map((c) => ({ params: { categoria: c.slug }, props: { c } }));

/** /funkos/caja-<n>-<s>: una página por composición de la caja. */
export const rutasCaja = () => composiciones().map(({ n, s }) => ({ params: { comp: `${n}-${s}` }, props: { n, s } }));
