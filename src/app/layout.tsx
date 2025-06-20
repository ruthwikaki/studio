
import type { Metadata } from 'next';
import './globals.css'; // Basic CSS

export const metadata: Metadata = {
  title: 'ARIA - Minimal Test',
  description: 'Minimal Next.js app for testing API routes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log('[RootLayout] Rendering layout...');
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <main>{children}</main>
      </body>
    </html>
  );
}
