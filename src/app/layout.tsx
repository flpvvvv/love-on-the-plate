import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Love on the Plate',
  description: 'Celebrating homemade meals with love',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
