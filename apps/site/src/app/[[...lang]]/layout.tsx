import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
// Bundled rather than fetched: the build must not depend on a font server.
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/readex-pro';
import '../globals.css';
import { LANGS, REDIRECT_SCRIPT, langInfo, langOf } from '@/lib/languages';

type Params = Promise<{ lang?: string[] }>;

/** `/`, `/la` and `/fr`, and nothing else: the site is exported as plain files. */
export function generateStaticParams() {
  return [{ lang: [] }, { lang: ['la'] }, { lang: ['fr'] }];
}
export const dynamicParams = false;

const OG_LOCALE = { ar: 'ar_TN', la: 'fr_TN', fr: 'fr_TN' } as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = langOf((await params).lang) ?? 'ar';
  return {
    metadataBase: new URL('https://chantia.tn'),
    title: 'Chantia · شوف التأخير قبل ما يكلّفك',
    description:
      'Planning, pointage, paie, matières, engins et contrôle : le coût réel de chaque chantier en Tunisie, tâche par tâche.',
    alternates: {
      canonical: langInfo(lang).path,
      // One page per language: search engines show each reader theirs.
      languages: Object.fromEntries(LANGS.map((item) => [item.html, item.path])),
    },
    openGraph: {
      title: 'Chantia',
      description: 'Voyez le retard avant qu’il vous coûte.',
      url: `https://chantia.tn${langInfo(lang).path}`,
      siteName: 'Chantia',
      locale: OG_LOCALE[lang],
      type: 'website',
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const lang = langOf((await params).lang);
  if (!lang) {
    notFound();
  }
  return (
    <html lang={langInfo(lang).html} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        {lang === 'ar' && <script dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
