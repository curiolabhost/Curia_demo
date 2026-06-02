import type { Metadata } from 'next'
import { DM_Sans, IBM_Plex_Mono, DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google'
import { DeviceProvider } from '@/context/DeviceContext'
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

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300'],
  variable: '--font-plus-jakarta-sans',
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
        className={`${dmSans.variable} ${ibmPlexMono.variable} ${dmSerifDisplay.variable} ${plusJakartaSans.variable}`}
      >
        <DeviceProvider>
          {children}
        </DeviceProvider>
      </body>
    </html>
  )
}
