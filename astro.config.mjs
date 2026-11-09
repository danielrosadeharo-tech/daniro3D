import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import sitio from './src/data/sitio.json' with { type: 'json' };

// El dominio definitivo se cambia en src/data/sitio.json → "dominio".
export default defineConfig({
  site: sitio.dominio,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap()],
  image: { layout: 'constrained' },
  devToolbar: { enabled: false },
  vite: { server: { watch: { ignored: ['**/.taste-skill/**', '**/dist/**'] } } },
});
