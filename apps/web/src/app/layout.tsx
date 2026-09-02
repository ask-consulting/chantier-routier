import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import './globals.css';
import { Providers } from './providers';
import { arabicFont } from './fonts';
import { THEME_INIT_SCRIPT } from '@/shared/theme/theme-provider';
import { SIDEBAR_COOKIE } from '@/shared/ui';
import { directionOf, type Locale } from '@/shared/i18n/config';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  return { title: t('name'), description: t('description') };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const dir = directionOf(locale);
  // Read here rather than in the browser: the rail's width is decided before the
  // first paint, so a collapsed menu never flashes open on the way in.
  const sidebarCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'collapsed';

  return (
    // `dir` on <html> is what actually mirrors the interface: every logical
    // property in the stylesheet resolves against it. Setting `lang` without it
    // would give Arabic text in a left-to-right layout.
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before the first paint. `suppressHydration
          * Warning` above is required because this script writes to <html>
          * before React sees it — the mismatch is intentional. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* The Arabic face is only attached when the page is in Arabic, so a
        * French reader never downloads it. */}
      <body
        className={`min-h-screen bg-surface text-fg ${locale === 'ar' ? arabicFont.className : ''}`}
      >
        <NextIntlClientProvider>
          <Providers>
            {/* The rail is the first child of the row, so `dir="rtl"` puts it on
              * the right without a single directional class. */}
            <div className="flex min-h-screen">
              <AppSidebar defaultCollapsed={sidebarCollapsed} />
              {/* `min-w-0`: without it a wide table stretches this column and
                * pushes the rail off-screen instead of scrolling inside itself. */}
              <div className="flex min-w-0 flex-1 flex-col">
                <AppHeader />
                <main className="mx-auto w-full max-w-content px-gutter py-section lg:px-gutter-lg">
                  {children}
                </main>
              </div>
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
