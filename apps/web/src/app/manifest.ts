import type { MetadataRoute } from 'next';

/**
 * The web app manifest — what makes the browser offer "Install" / "Add to
 * Home Screen", and what the installed app looks like: its name, its icon,
 * a window without the browser's address bar.
 *
 * In French: a manifest is one file for everyone, and French is the product's
 * default language. The screens themselves follow each user's language once
 * open.
 *
 * Colours are hard-coded, like `icon.svg`: the manifest is read by the system,
 * which has no access to the stylesheet. `theme_color` is the brand ring's
 * slate, `background_color` the page's `--surface`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Chantia — Gestion de chantiers routiers',
    short_name: 'Chantia',
    description: 'Chantiers, ouvriers, matériel et coûts, au bureau comme sur le terrain.',
    lang: 'fr',
    dir: 'auto',
    start_url: '/worksites',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#2c3e50',
    background_color: '#f8fafc',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // A long press on the installed icon.
    shortcuts: [
      { name: 'Chantiers', url: '/worksites', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Matériel', url: '/equipment', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Ouvriers', url: '/workers', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
