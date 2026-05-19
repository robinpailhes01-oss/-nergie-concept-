import './globals.css';
import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import { Sidebar } from '@/components/layout/Sidebar';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-outfit',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Énergies Concept — Dashboard prospection solaire',
  description:
    "Plateforme d'analyse solaire et de prospection pour Énergies Concept, installateur photovoltaïque à Montpellier.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${outfit.variable} ${jakarta.variable}`}>
      <body>
        <div className="min-h-screen">
          <Sidebar />
          <main className="md:ml-[240px] min-h-screen p-6 md:p-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
