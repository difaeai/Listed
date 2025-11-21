
// NO "use client" here
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// Toaster is now rendered inside AppContentClient
import { AuthProvider } from '@/contexts/AuthContext';
import { AppContentClient } from './app-content-client'; // Import the new client component
import { DynamicChatbot } from '@/components/common/dynamic-chatbot';

const inter = Inter({ subsets: ['latin'] });

const siteConfig = {
  name: 'LISTED',
  url: 'https://www.listed.com.pk', // Replace with your actual production domain
  ogImage: 'https://www.listed.com.pk/og.png', // Replace with a link to your open graph image
  description:
    "LISTED is Pakistan's premier ecosystem for founders, sales professionals, and investors. Secure funding from 1100+ angel investors, find high-commission sales offers, or invest in the next big thing.",
  links: {
    twitter: 'https://twitter.com/listedpk', // Replace with your actual Twitter handle
    linkedin: 'https://www.linkedin.com/company/listedpk', // Replace with your actual LinkedIn page
  },
  keywords: [
    'startup funding Pakistan',
    'angel investors Pakistan',
    'venture capital Pakistan',
    'business ideas Pakistan',
    'commission-based sales jobs',
    'find a co-founder Pakistan',
    'invest in startups Pakistan',
    'business opportunities Karachi',
    'entrepreneurship Lahore',
    'tech startups Islamabad',
    'LISTED PK',
  ],
};

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [
    {
      name: 'The LISTED Team',
      url: siteConfig.url,
    },
  ],
  creator: 'The LISTED Team',
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@listedpk', // Replace with your actual Twitter handle
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: `${siteConfig.url}/site.webmanifest`,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("[RootLayout] Rendering with AuthProvider and AppContentClient wrapper.");
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <AppContentClient>{children}</AppContentClient>
          <DynamicChatbot />
        </AuthProvider>
      </body>
    </html>
  );
}
