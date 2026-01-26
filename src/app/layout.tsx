import type { Metadata } from 'next';
import { ThemeProvider, ToastProvider } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Love on the Plate',
  description: 'Celebrating homemade meals with love',
  icons: {
    icon: '/favicon.svg',
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFBF8' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0C0A' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-love focus:text-white focus:rounded-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
