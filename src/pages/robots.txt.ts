import type { APIRoute } from 'astro';
import sitio from '../data/sitio.json';

// Se genera desde sitio.json para que el dominio solo se cambie en un sitio.
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /
Disallow: /cesta
Disallow: /cuenta
Disallow: /admin

Sitemap: ${new URL('/sitemap-index.xml', sitio.dominio)}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
