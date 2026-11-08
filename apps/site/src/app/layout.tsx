import type { Metadata } from 'next';
import { Bricolage_Grotesque, Readex_Pro } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const body = Readex_Pro({
  subsets: ['latin', 'arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

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
    <html lang="aeb" dir="rtl" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
