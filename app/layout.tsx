import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import { NavigationLoadingOverlay } from '@/components/shell/navigation-loading-overlay';
import { EventWidgetProvider } from '@/components/context/event-widget-provider';
import EventWidget from '@/components/shell/event-widget';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const centuryGothic = localFont({
  src: [
    {
      path: '../public/fonts/centurygothic.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/centurygothic_bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-century-gothic',
});

export const metadata: Metadata = {
  title: {
    default: 'drAIn',
    template: '%s | drAIn',
  },
  description:
    'Drainage flood simulation and citizen flood reporting for Mandaue City.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${centuryGothic.variable} antialiased`}
      >
        <Providers>
          <EventWidgetProvider>
            {children}
            <NavigationLoadingOverlay />
            <Toaster position="top-center" />
            <EventWidget />
          </EventWidgetProvider>
        </Providers>
      </body>
    </html>
  );
}
