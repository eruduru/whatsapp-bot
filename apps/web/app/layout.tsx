import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The German Portal — Lead Dashboard',
  description: 'WhatsApp lead management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        {children}
      </body>
    </html>
  );
}
