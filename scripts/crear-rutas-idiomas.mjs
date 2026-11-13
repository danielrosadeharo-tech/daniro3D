// Crea las páginas de /en y /fr: cada una importa la página española y le pasa sus props.
// El idioma lo saca la propia página de la URL (src/i18n). Si añades una página pública nueva,
// añádela a PAGINAS y ejecuta: node scripts/crear-rutas-idiomas.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const PAGINAS = [
  { ruta: 'index.astro' },
  { ruta: 'catalogo/index.astro' },
  { ruta: 'catalogo/[categoria].astro', paths: 'rutasCategoria' },
  { ruta: 'producto/[slug].astro', paths: 'rutasProducto' },
  { ruta: 'funkos.astro' },
  { ruta: 'funkos/caja-[comp].astro', paths: 'rutasCaja' },
  { ruta: 'encargos.astro' },
  { ruta: 'sobre-nosotros.astro' },
  { ruta: 'envios.astro' },
  { ruta: 'devoluciones.astro' },
  { ruta: 'privacidad.astro' },
  { ruta: 'cesta.astro' },
  { ruta: 'cuenta.astro' },
];

const posix = (p) => p.split('\\').join('/');
for (const idioma of ['en', 'fr']) {
  for (const { ruta, paths } of PAGINAS) {
    const destino = join('src', 'pages', idioma, ruta);
    const dir = dirname(destino);
    const original = posix(relative(dir, join('src', 'pages', ruta)));
    const rutas = posix(relative(dir, join('src', 'lib', 'rutas')));
    const cuerpo = [
      '---',
      `// Generado por scripts/crear-rutas-idiomas.mjs: la misma página que /${ruta.replace(/(index)?\.astro$/, '')}, en ${idioma === 'en' ? 'inglés' : 'francés'}.`,
      `import Pagina from '${original.startsWith('.') ? original : './' + original}';`,
      ...(paths ? [`import { ${paths} } from '${rutas}';`, `export const getStaticPaths = ${paths};`] : []),
      '---',
      '<Pagina {...Astro.props} />',
      '',
    ].join('\n');
    mkdirSync(dir, { recursive: true });
    writeFileSync(destino, cuerpo);
  }
}
console.log('rutas creadas en src/pages/en y src/pages/fr');
