import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MTG Memo App',
  description: 'Build-safe Next.js baseline with Neon Postgres APIs.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
