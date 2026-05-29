import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://yonathan-raviv.dev',
  output: 'static',
  compressHTML: true,
  integrations: [sitemap()],
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  markdown: {
    shikiConfig: {
      theme: 'material-theme-palenight',
      wrap: false,
    },
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
