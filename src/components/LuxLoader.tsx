'use client';

interface Props {
  label?: string;
}

export default function LuxLoader({ label = 'Загрузка...' }: Props) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Анимированный спиннер */}
        <div className="relative w-16 h-16">
          {/* Внешнее кольцо */}
          <div className="absolute inset-0 rounded-full border-4 border-camo-700/30" />
          
          {/* Вращающееся кольцо */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 border-r-emerald-400 animate-spin"
            style={{ animationDuration: '1s' }}
          />
          
          {/* Внутренний пульсирующий круг */}
          <div 
            className="absolute inset-2 rounded-full bg-emerald-500/20"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          
          {/* Центральная точка */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        </div>
        
        {/* Текст с анимацией */}
        <div className="text-neutral-400 text-sm font-medium animate-pulse">
          {label}
        </div>
        
        {/* Прогресс бар */}
        <div className="w-48 h-1 bg-camo-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
            style={{
              animation: 'loading-bar 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}