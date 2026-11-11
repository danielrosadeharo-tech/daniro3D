import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import sitio from './src/data/sitio.json' with { type: 'json' };

// El dominio definitivo se cambia en src/data/sitio.json → "dominio".
export default defineConfig({
  site: sitio.dominio,
  trailingSlash: 'never',
  build: { format: 'file' },
  // Las páginas privadas (cesta, cuenta, panel) y las de cada caja de Funko (noindex) no van al sitemap
  integrations: [sitemap({ filter: (url) => !/\/(admin|cuenta|cesta|funkos\/caja-[^/]*)(\/|$|\.)/.test(url) })],
  image: { layout: 'constrained' },
  devToolbar: { enabled: false },
  vite: { server: { watch: { ignored: ['**/.taste-skill/**', '**/dist/**'] } } },
});
