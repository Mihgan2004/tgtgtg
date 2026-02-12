'use client';
import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface UserOption {
  id: string;
  label: string;
}

interface Props {
  options: UserOption[];
}

export default function UsersPicker({ options }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const currentCode = params.get('code') ?? options[0]?.id ?? '';
  
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(currentCode);

  const filtered = inputValue
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        opt.id.includes(inputValue)
      )
    : options;

  const handleSelect = (id: string) => {
    setSelectedCode(id);
    setIsOpen(false);
    setInputValue('');
  };

  const handleApply = () => {
    const newParams = new URLSearchParams(params.toString());
    newParams.set('code', selectedCode);
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const handleReset = () => {
    const firstCode = options[0]?.id;
    if (firstCode) {
      setSelectedCode(firstCode);
      const newParams = new URLSearchParams(params.toString());
      newParams.set('code', firstCode);
      router.push(`${pathname}?${newParams.toString()}`);
    }
  };

  const currentUser = options.find(o => o.id === selectedCode);

  return (
    <div className="card">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-200 uppercase tracking-wider">
            Выбор кода доступа
          </div>
          <div className="text-xs text-neutral-500">
            Всего: {options.length}
          </div>
        </div>

        <div className="relative">
          {!isOpen ? (
            <button
              onClick={() => setIsOpen(true)}
              className="w-full px-4 py-3 rounded-lg bg-camo-700/70 border border-white/10 text-left flex items-center justify-between hover:bg-camo-700 hover:border-emerald-500/30 transition-all"
            >
              <span className="text-neutral-200 font-medium">
                {currentUser?.label || 'Выберите код'}
              </span>
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Поиск по коду..."
                autoFocus
                className="w-full px-4 py-3 rounded-lg bg-camo-700/70 border border-emerald-500/50 focus:border-emerald-500 text-neutral-200 placeholder-neutral-500 outline-none transition-colors"
              />
              <button
                onClick={() => {
                  setIsOpen(false);
                  setInputValue('');
                }}
                className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                ✕ Отмена
              </button>
            </div>
          )}

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-lg bg-camo-800 border border-white/10 shadow-xl z-10 custom-scrollbar">
              {filtered.length > 0 ? (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className={`
                      w-full px-4 py-3 text-left transition-colors border-b border-white/5 last:border-0
                      ${opt.id === selectedCode 
                        ? 'bg-emerald-600/20 text-emerald-300' 
                        : 'hover:bg-camo-700/50 text-neutral-200'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{opt.label}</span>
                      {opt.id === selectedCode && (
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-neutral-500">
                  Код не найден
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопки Применить и Сбросить */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 active:bg-emerald-600 text-white font-medium transition-all"
          >
            ✓ Применить
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-lg bg-camo-700/80 hover:bg-camo-600 text-neutral-300 font-medium transition-all"
          >
            ↻ Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}