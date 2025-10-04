'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface UserOption {
  id: string;
  label: string;
}

interface Props {
  options: UserOption[];
}

export default function UsersPicker({ options }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const currentUid = params.get('uid') ?? options[0]?.id ?? '';
  
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = inputValue
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        opt.id.includes(inputValue)
      )
    : options;

  const handleSelect = (id: string) => {
    const newParams = new URLSearchParams(params.toString());
    newParams.set('uid', id);
    router.push(`/stats?${newParams.toString()}`);
    setIsOpen(false);
    setInputValue('');
  };

  const currentUser = options.find(o => o.id === currentUid);

  return (
    <div className="card">
      <div className="flex flex-col gap-3">
        <div className="text-xs sm:text-sm uppercase tracking-widest text-neutral-400 font-semibold">
          Выбор пользователя
        </div>

        <div className="relative">
          {/* Текущий выбор / Поле ввода */}
          {!isOpen ? (
            <button
              onClick={() => setIsOpen(true)}
              className="w-full px-4 py-3 rounded-lg bg-camo-700/70 border border-white/10 text-left flex items-center justify-between hover:bg-camo-700 transition-colors"
            >
              <span className="text-neutral-200">
                {currentUser?.label || 'Выберите пользователя'}
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
                placeholder="Введите @username или ID"
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
                Отмена
              </button>
            </div>
          )}

          {/* Dropdown список */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-lg bg-camo-800 border border-white/10 shadow-xl z-10">
              {filtered.length > 0 ? (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className={`
                      w-full px-4 py-3 text-left transition-colors border-b border-white/5 last:border-0
                      ${opt.id === currentUid 
                        ? 'bg-emerald-600/20 text-emerald-300' 
                        : 'hover:bg-camo-700/50 text-neutral-200'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{opt.label}</span>
                      {opt.id === currentUid && (
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">ID: {opt.id}</div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-neutral-500">
                  Пользователь не найден
                </div>
              )}
            </div>
          )}
        </div>

        {/* Быстрый выбор первых 3х */}
        {options.length > 0 && !isOpen && (
          <div className="flex gap-2 flex-wrap">
            <div className="text-xs text-neutral-500 w-full mb-1">Быстрый выбор:</div>
            {options.slice(0, 3).map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`
                  px-3 py-1.5 rounded-md text-sm transition-all
                  ${opt.id === currentUid
                    ? 'bg-emerald-600/60 text-white border border-emerald-500/50'
                    : 'bg-camo-700/50 text-neutral-300 border border-white/5 hover:bg-camo-700'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}