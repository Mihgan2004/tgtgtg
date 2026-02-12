'use client';
import { useState, useEffect } from 'react';

const CORRECT_PIN = '123456';
const STORAGE_KEY = 'stats_pin_unlocked';

interface Props {
  children: React.ReactNode;
}

export default function PinLock({ children }: Props) {
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем sessionStorage (работает в браузере, не в artifacts)
    const unlocked = typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY);
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }
    setLoading(false);
  }, []);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      // Автоматическая проверка при 6 цифрах
      if (newPin.length === 6) {
        setTimeout(() => checkPin(newPin), 100);
      }
    }
  };

  const checkPin = (pinToCheck: string) => {
    if (pinToCheck === CORRECT_PIN) {
      setIsUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      }
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-camo-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-camo-950 flex items-center justify-center px-4 bg-grid">
      <div className="w-full max-w-sm">
        <div className="card p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="text-2xl font-bold text-emerald-300 mb-2">
              Ops Dashboard
            </div>
            <div className="text-sm text-neutral-400">
              Введите PIN-код для доступа
            </div>
          </div>

          {/* Индикаторы точек */}
          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  i < pin.length
                    ? error
                      ? 'bg-red-500 scale-110'
                      : 'bg-emerald-500 scale-110'
                    : 'bg-camo-700 border border-white/10'
                }`}
              />
            ))}
          </div>

          {/* Сообщение об ошибке */}
          {error && (
            <div className="text-center mb-4 text-red-400 text-sm animate-pulse">
              ✕ Неверный PIN-код
            </div>
          )}

          {/* Цифровая клавиатура */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(String(num))}
                className="aspect-square rounded-xl bg-camo-800/80 hover:bg-camo-700 active:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/30 text-white text-2xl font-semibold transition-all"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Нижний ряд: Clear, 0, Backspace */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleClear}
              className="aspect-square rounded-xl bg-camo-800/80 hover:bg-camo-700 active:bg-red-600/20 border border-white/10 hover:border-red-500/30 text-neutral-400 text-sm font-medium transition-all flex items-center justify-center"
            >
              C
            </button>
            <button
              onClick={() => handleNumberClick('0')}
              className="aspect-square rounded-xl bg-camo-800/80 hover:bg-camo-700 active:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/30 text-white text-2xl font-semibold transition-all"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="aspect-square rounded-xl bg-camo-800/80 hover:bg-camo-700 active:bg-amber-600/20 border border-white/10 hover:border-amber-500/30 text-neutral-400 transition-all flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            </button>
          </div>

          {/* Подсказка */}
          <div className="mt-6 text-center text-xs text-neutral-600">
            Защищённый доступ
          </div>
        </div>
      </div>
    </div>
  );
}