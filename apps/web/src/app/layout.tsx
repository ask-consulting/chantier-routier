import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import './globals.css';
import { Providers } from './providers';
import { arabicFont } from './fonts';
import { THEME_INIT_SCRIPT } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { Logo } from '@/components/brand';
import { UserMenu } from '@/components/auth/user-menu';
import { directionOf, type Locale } from '@/i18n/config';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  return { title: t('name'), description: t('description') };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const dir = directionOf(locale);

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
            <header className="border-b border-border bg-surface-raised">
              <div className="mx-auto flex max-w-content items-center justify-between px-gutter py-3 lg:px-gutter-lg">
                <Logo />
                <div className="flex items-center gap-2">
                  <UserMenu />
                  <LocaleSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-content px-gutter py-section lg:px-gutter-lg">
              {children}
            </main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
