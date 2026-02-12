// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import PinLock from '@/components/PinLock'
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-ui' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Ops Dashboard · Аналитика',
  description: 'Система аналитики отчётов',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        <PinLock>
          <div className="min-h-screen w-full overflow-x-hidden bg-grid">
            {/* Фиксированный header */}
            <header className="sticky top-0 z-20 backdrop-blur-md bg-camo-900/80 border-b border-white/10 shadow-lg">
              <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-3">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                    OPS DASHBOARD
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">
                    Система аналитики
                  </div>
                </div>
              </div>
            </header>
            
            {/* Main контент */}
            <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
              {children}
            </main>
          </div>
        </PinLock>
      </body>
    </html>
  )
}