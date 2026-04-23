import type { Metadata } from 'next';
import './globals.css';
import { SessionTimeoutGuard } from '../components/session-timeout-guard';

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
        <SessionTimeoutGuard />
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
