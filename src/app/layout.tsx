import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VaultWatch - Crypto Projects\' Promises, Permanently Recorded',
  description:
    'Track and verify crypto project commitments with DataHaven decentralized storage. Transparency you can trust.',
  keywords: [
    'crypto',
    'blockchain',
    'transparency',
    'datahaven',
    'decentralized storage',
    'project tracking',
  ],
  authors: [{ name: 'VaultWatch' }],
  openGraph: {
    title: 'VaultWatch',
    description: 'Crypto Projects\' Promises, Permanently Recorded',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
