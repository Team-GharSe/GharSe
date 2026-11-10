import type { Metadata } from 'next';
import { Bagel_Fat_One, Caveat, DM_Mono, DM_Sans } from 'next/font/google';
import '@/styles/globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const display = Bagel_Fat_One({ weight: '400', subsets: ['latin'], variable: '--f-display', display: 'swap' });
const body = DM_Sans({ subsets: ['latin'], variable: '--f-body', display: 'swap' });
const hand = Caveat({ weight: ['700'], subsets: ['latin'], variable: '--f-hand', display: 'swap' });
const mono = DM_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--f-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'GharSe', template: '%s · GharSe' },
  description: "Mumbai's home makers, pinned up in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${hand.variable} ${mono.variable}`}>
      <body>
        <div className="page">
          <Header />
          <main>{children}</main>
        </div>
        <Footer />
      </body>
    </html>
  );
}