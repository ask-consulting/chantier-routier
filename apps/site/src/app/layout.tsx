import type { Metadata } from 'next';
// Bundled rather than fetched: the build must not depend on a font server.
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/readex-pro';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://chantia.tn'),
  title: 'Chantia · شوف التأخير قبل ما يكلّفك',
  description:
    'Planning, pointage, paie, matières, engins et contrôle : le coût réel de chaque chantier en Tunisie, tâche par tâche.',
  openGraph: {
    title: 'Chantia',
    description: 'Voyez le retard avant qu’il vous coûte.',
    url: 'https://chantia.tn',
    siteName: 'Chantia',
    locale: 'fr_TN',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="aeb" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
