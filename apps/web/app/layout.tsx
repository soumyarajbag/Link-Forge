import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LinkForge — Links that move with you',
  description: 'Create, organize, and understand every link with LinkForge.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
