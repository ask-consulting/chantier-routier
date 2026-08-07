import { IBM_Plex_Sans_Arabic } from 'next/font/google';

/**
 * Arabic type.
 *
 * The system font renders Arabic very unevenly — acceptable on recent macOS and
 * Android, poor on Windows — and its weights and heights do not match the Latin
 * face used everywhere else, so a bilingual interface looks assembled from two
 * different products.
 *
 * IBM Plex Sans Arabic is drawn as a companion to the Latin IBM Plex, so its
 * proportions sit correctly next to a neutral sans. Loaded through `next/font`,
 * so it is self-hosted, preloaded and immune to the layout shift a webfont
 * usually costs.
 *
 * Exposed as a CSS variable and applied only when `lang="ar"`: a French reader
 * never downloads it.
 */
export const arabicFont = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-arabic',
  display: 'swap',
});
