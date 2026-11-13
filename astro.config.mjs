import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import sitio from './src/data/sitio.json' with { type: 'json' };

// El dominio definitivo se cambia en src/data/sitio.json → "dominio".
export default defineConfig({
  site: sitio.dominio,
  trailingSlash: 'never',
  build: { format: 'file' },
  // Las páginas privadas (cesta, cuenta, panel) y las de cada caja de Funko (noindex) no van al sitemap
  // Cada página enlaza sus versiones en inglés (/en) y francés (/fr) para los buscadores
  integrations: [sitemap({
    filter: (url) => !/\/(admin|cuenta|cesta|funkos\/caja-[^/]*)(\/|$|\.)/.test(url),
    i18n: { defaultLocale: 'es', locales: { es: 'es-ES', en: 'en-GB', fr: 'fr-FR' } },
  })],
  image: { layout: 'constrained' },
  devToolbar: { enabled: false },
  vite: { server: { watch: { ignored: ['**/.taste-skill/**', '**/dist/**'] } } },
});
