import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Chantia',
  description: 'Gestion de chantiers routiers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <header className="border-b border-black/10 dark:border-white/10">
            <div className="mx-auto max-w-5xl px-6 py-4">
              <span className="text-lg font-semibold tracking-tight">Chantia</span>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
