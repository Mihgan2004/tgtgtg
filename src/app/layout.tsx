import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Miniapps · Stats',
  description: 'Compact ops dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        <div className="min-h-screen w-full overflow-x-hidden bg-grid">
          {/* Фиксированный header с правильными отступами */}
          <header className="sticky top-0 z-20 backdrop-blur-md bg-camo-900/80 border-b border-white/10 shadow-lg">
            <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-3">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-semibold tracking-wide bg-gradient-to-r from-camo-300 to-emerald-400 bg-clip-text text-transparent">
                  mihganus
                </div>
              </div>
            </div>
          </header>
          
          {/* Main контент с безопасными отступами */}
          <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}