'use client';
import { useEffect, useState } from 'react';

export default function SplashIntro() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Скрываем через 2 секунды
    const timer1 = setTimeout(() => {
      setIsAnimating(false);
    }, 2000);

    // Полностью удаляем через 2.5 секунды
    const timer2 = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center bg-camo-950
        transition-opacity duration-500
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div className="text-center">
        {/* Анимированный логотип */}
        <div 
          className="mb-6"
          style={{
            animation: 'pop 1s cubic-bezier(0.34, 1.56, 0.64, 1) both'
          }}
        >
          <div className="text-5xl font-bold bg-gradient-to-r from-camo-300 via-emerald-400 to-camo-300 bg-clip-text text-transparent animate-pulse">
            mihganus
          </div>
        </div>
        
        {/* Подзаголовок */}
        <div 
          className="text-neutral-400 text-sm tracking-widest uppercase"
          style={{
            animation: 'rise 0.8s ease 0.3s both'
          }}
        >
          Ops Dashboard
        </div>
        
        {/* Прогресс линия */}
        <div 
          className="mt-8 w-64 h-1 bg-camo-800 rounded-full mx-auto overflow-hidden"
          style={{
            animation: 'rise 0.6s ease 0.5s both'
          }}
        >
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
            style={{
              animation: 'progress-fill 1.5s ease-out forwards'
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes progress-fill {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}