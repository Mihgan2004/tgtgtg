// src/components/CodeFilterBar.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';

export default function CodeFilterBar({ initialUser }: { initialUser?: string }) {
  const [open, setOpen] = useState(false);

  const quickCodes = useMemo(() => ['100', '101', '102'], []);

  const writeSearch = useCallback((user?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'users');
    params.delete('user');
    if (user && user.length > 0) params.set('user', user);
    window.location.search = params.toString();
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const user = String(fd.get('user') || '').trim();
    writeSearch(user || undefined);
  };

  const isActiveQuick = (code: string) => (initialUser || '') === code;

  return (
    <section
      className={[
        'rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm',
        'px-4 md:px-6 py-4 md:py-5',
      ].join(' ')}
      aria-label="Фильтр по коду"
    >
      {/* Шапка: текст + кнопка; ниже — тонкая линия */}
      <div className="px-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-white/55">
            Быстрый доступ:
          </span>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={[
              'h-7 px-2 rounded-md text-[12px]',
              'border border-white/10 bg-white/[0.02] hover:bg-white/[0.07] text-white/80',
              'outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30',
            ].join(' ')}
          >
            {open ? 'Скрыть расширенный' : 'Расширенный фильтр'}
          </button>
        </div>

        <div className="mt-2 h-px w-full bg-white/12" />
      </div>

      {/* Капсулы быстрых кодов */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {quickCodes.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => writeSearch(code)}
            className={[
              'h-9 rounded-lg px-3 text-[13px]',
              isActiveQuick(code)
                ? 'bg-emerald-500/90 text-black border border-emerald-400'
                : 'border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/90',
              'outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30 transition font-medium',
            ].join(' ')}
            aria-pressed={isActiveQuick(code)}
          >
            {code}
          </button>
        ))}
      </div>

      {/* Расширенный фильтр: поле + действия */}
      {open && (
        <form
          onSubmit={onSubmit}
          className={[
            'mt-5',
            'grid items-center gap-3 md:gap-4',
            'grid-cols-1 md:grid-cols-[1fr_auto]',
          ].join(' ')}
          aria-label="Расширенный фильтр по коду"
        >
          <input
            id="user"
            name="user"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Фильтр по коду"
            aria-label="Фильтр по коду"
            defaultValue={initialUser || ''}
            className={[
              'h-10 w-full min-w-[220px] rounded-lg px-3',
              'bg-white/5 border border-white/12 outline-none',
              'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition',
            ].join(' ')}
          />

          <div className="flex items-center justify-end gap-2 self-center">
            <button
              type="submit"
              className={[
                'h-10 px-4 rounded-lg inline-flex items-center gap-2',
                'bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold',
                'shadow-md shadow-emerald-500/15 outline-none',
                'focus-visible:ring-2 focus-visible:ring-emerald-400/40',
                'whitespace-nowrap',
              ].join(' ')}
            >
              ✓ Применить
            </button>

            <a
              href="/stats?tab=users"
              className={[
                'h-10 px-4 rounded-lg inline-flex items-center gap-2',
                'border border-white/12 bg-white/[0.02] hover:bg-white/[0.07]',
                'text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/25',
                'whitespace-nowrap',
              ].join(' ')}
            >
              ↺ Сбросить
            </a>
          </div>
        </form>
      )}
    </section>
  );
}
