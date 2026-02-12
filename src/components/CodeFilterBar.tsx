// src/components/CodeFilterBar.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';

export default function CodeFilterBar({ initialUser }: { initialUser?: string }) {
  const [open, setOpen] = useState(false);
  const quickCodes = useMemo(() => ['100', '101', '102'], []);

  const writeSearch = useCallback((user?: string) => {
    const qs = new URLSearchParams(window.location.search);
    qs.set('tab', 'users');
    qs.delete('user');
    if (user && user.length > 0) qs.set('user', user);
    window.location.search = qs.toString();
  }, []);

  const resetUsers = () => {
    const qs = new URLSearchParams(window.location.search);
    qs.set('tab', 'users');
    qs.delete('user');
    window.location.search = qs.toString();
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    writeSearch(String(fd.get('user') || '').trim() || undefined);
  };

  const isActiveQuick = (code: string) => (initialUser || '') === code;

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-4 py-4 md:px-6 md:py-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-wide text-white/55">Быстрый доступ:</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="h-8 px-3 rounded-md text-[12px] border border-white/10 bg-white/[0.02] hover:bg-white/[0.07] text-white/85 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30"
        >
          {open ? 'Скрыть расширенный' : 'Расширенный фильтр'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {quickCodes.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => writeSearch(code)}
            aria-pressed={isActiveQuick(code)}
            className={[
              'h-9 rounded-lg px-3 text-[13px] font-medium',
              isActiveQuick(code)
                ? 'bg-emerald-500/90 text-black border border-emerald-400'
                : 'border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/90',
            ].join(' ')}
          >
            {code}
          </button>
        ))}
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3">
          <input
            id="user"
            name="user"
            // обычная клавиатура
            inputMode="text"
            placeholder="Фильтр по коду"
            defaultValue={initialUser || ''}
            className="h-11 w-full rounded-lg px-3 bg-white/5 border border-white/12 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
          />

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/15 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
          >
            ✓ Применить
          </button>
          <button
            type="button"
            onClick={resetUsers}
            className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.02] hover:bg-white/[0.07] text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/25"
          >
            ↺ Сбросить
          </button>
        </form>
      )}
    </section>
  );
}
