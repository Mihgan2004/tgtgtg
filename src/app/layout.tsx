import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Miniapps · Stats',
  description: 'Compact ops dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div className="min-h-dvh bg-grid">
          {/* верхняя панель без «хлебных крошек», центрированная */}
          <header className="sticky top-0 z-20 backdrop-blur bg-camo-900/70 border-b border-white/10">
            <div className="mx-auto max-w-6xl px-4 py-3 grid place-items-center">
              <div className="text-xl font-semibold tracking-wide">mihganus</div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
