import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crise Kitty',
  description: 'Interface Next.js pour l API Crise Kitty.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
