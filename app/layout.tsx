import type { Metadata } from 'next'
import { DM_Sans, IBM_Plex_Mono, DM_Serif_Display } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'codelab',
  description: 'Interactive coding lessons',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${ibmPlexMono.variable} ${dmSerifDisplay.variable}`}
      >
        {children}
      </body>
    </html>
  )
}
