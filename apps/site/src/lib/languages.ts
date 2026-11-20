import type { Lang } from '@/content/copy';

/**
 * The showcase's three languages, each a page of its own: `/` in Tunisian
 * written in Arabic letters, `/la` in Latin letters, `/fr` in French. Built as
 * three static files, each already in its language, its `lang` and its
 * direction: nothing switches after the first paint.
 */
export const LANGS: readonly { id: Lang; label: string; html: string; path: string }[] = [
  { id: 'ar', label: 'تونسي', html: 'aeb', path: '/' },
  { id: 'la', label: 'Tounsi', html: 'aeb-Latn', path: '/la' },
  { id: 'fr', label: 'Français', html: 'fr', path: '/fr' },
];

/** Where the visitor's choice is kept, to bring them back to it on `/`. */
export const STORAGE_KEY = 'chantia-lang';

/** The language of a path segment: none is the default page, in Arabic letters. */
export function langOf(segments: readonly string[] | undefined): Lang | null {
  const [segment, ...rest] = segments ?? [];
  if (rest.length > 0) {
    return null;
  }
  if (segment === undefined) {
    return 'ar';
  }
  return segment === 'la' || segment === 'fr' ? segment : null;
}

export function langInfo(lang: Lang) {
  return LANGS.find((item) => item.id === lang) ?? LANGS[0]!;
}

/**
 * Run in `<head>` of `/`, before anything is painted: a visitor who chose
 * another language goes straight to its page. Only on `/` — a link to `/fr`
 * opens in French whatever was chosen before.
 */
export const REDIRECT_SCRIPT = `try{var l=localStorage.getItem('${STORAGE_KEY}');if(l==='la'||l==='fr'){location.replace('/'+l+location.search+location.hash)}}catch(e){}`;
