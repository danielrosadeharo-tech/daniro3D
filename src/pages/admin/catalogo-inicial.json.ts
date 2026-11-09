// Catálogo actual (productos.json) con una miniatura de cada foto, para el panel de administración:
// sirve para "Importar el catálogo actual a Firestore" y para enseñar las fotos que están en el repositorio.
import { getImage } from 'astro:assets';
import { todos, foto } from '../../lib/catalogo';
import categorias from '../../data/categorias.json';

export async function GET() {
  const productos = await Promise.all(todos.map(async (p) => ({
    ...p,
    galeria: await Promise.all(p.galeria.map(async (g, i) => ({
      ...g,
      preview: (await getImage({ src: foto(p, i).src, width: 160, format: 'webp' })).src,
    }))),
  })));
  return new Response(JSON.stringify({ productos, categorias }), { headers: { 'Content-Type': 'application/json' } });
}
