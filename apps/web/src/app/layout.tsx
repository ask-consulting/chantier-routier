import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { THEME_INIT_SCRIPT } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export const metadata: Metadata = {
  title: 'Chantia',
  description: 'Gestion de chantiers routiers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before the first paint. `suppressHydration
          * Warning` above is required because this script writes to <html>
          * before React sees it — the mismatch is intentional. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-surface text-fg">
        <Providers>
          <header className="border-b border-border bg-surface-raised">
            <div className="mx-auto flex max-w-content items-center justify-between px-gutter py-3 lg:px-gutter-lg">
              <span className="text-lg font-semibold tracking-tight">Chantia</span>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto max-w-content px-gutter py-section lg:px-gutter-lg">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
