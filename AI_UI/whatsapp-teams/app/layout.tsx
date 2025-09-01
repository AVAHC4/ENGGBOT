import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { FlickeringGrid } from '../components/ui/flickering-grid'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>){
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="!bg-transparent">
        {/* Global animated background to match main app */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <FlickeringGrid color="#CCCCCC" maxOpacity={0.2} className="absolute inset-0" />
        </div>
        {children}
      </body>
    </html>
  )
}
