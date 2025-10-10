// src/components/PeriodFilterBar.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  initialFrom?: string;
  initialTo?: string;
  initialAll?: boolean;
  resetHref: string;
};

export default function PeriodFilterBar({
  initialFrom = '',
  initialTo = '',
  initialAll = false,
  resetHref,
}: Props) {
  const [allTime, setAllTime] = useState<boolean>(!!initialAll);
  const [open, setOpen] = useState(false);

  const fromRef = useRef<HTMLInputElement | null>(null);
  const toRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setAllTime(!!initialAll), [initialAll]);

  const fmtDate = useCallback((d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const presets = useMemo(() => {
    const today = new Date();
    const addDays = (base: Date, days: number) => {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d;
    };
    const startOfQuarter = () => {
      const d = new Date(today);
      const q = Math.floor(d.getMonth() / 3) * 3;
      return new Date(d.getFullYear(), q, 1);
    };
    const startOfYear = () => new Date(today.getFullYear(), 0, 1);

    return [
      { key: 'all', label: 'За весь период' as const },
      { key: 't', label: 'Сегодня', from: fmtDate(today), to: fmtDate(today) },
      { key: '7', label: '7 дней', from: fmtDate(addDays(today, -6)), to: fmtDate(today) },
      { key: '30', label: '30 дней', from: fmtDate(addDays(today, -29)), to: fmtDate(today) },
      { key: 'q', label: 'Квартал', from: fmtDate(startOfQuarter()), to: fmtDate(today) },
      { key: 'y', label: 'Год', from: fmtDate(startOfYear()), to: fmtDate(today) },
    ] as const;
  }, [fmtDate]);

  const writeSearch = useCallback((from?: string, to?: string, all?: boolean) => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const user = params.get('user');

    ['from', 'to', 'all'].forEach((k) => params.delete(k));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (all) params.set('all', '1');
    if (tab) params.set('tab', tab!);
    if (user) params.set('user', user!);

    window.location.search = params.toString();
  }, []);

  const applyRange = useCallback(
    (from: string, to: string) => {
      setAllTime(false);
      writeSearch(from, to, false);
    },
    [writeSearch],
  );

  const applyAll = useCallback(() => {
    setAllTime(true);
    writeSearch(undefined, undefined, true);
  }, [writeSearch]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const from = String(fd.get('from') || '').trim();
    const to = String(fd.get('to') || '').trim();
    const all = !!fd.get('all');
    writeSearch(from || undefined, to || undefined, all);
  };

  return (
    <section
      className={[
        'period-filter',
        'rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm',
        'px-4 md:px-6 py-4 md:py-5',
      ].join(' ')}
      aria-label="Фильтр периода"
    >
      {/* Шапка: текст и кнопка — ВЫШЕ линии; сама линия ниже */}
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

        {/* Сплошная тонкая линия под шапкой */}
        <div className="mt-2 h-px w-full bg-white/12" />
      </div>

      {/* Капсулы пресетов — центр, перенос при нехватке места */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={applyAll}
          className={[
            'h-9 rounded-lg px-3 text-[13px]',
            allTime
              ? 'bg-emerald-500/90 text-black border border-emerald-400'
              : 'border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/90',
            'outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30 transition font-medium',
          ].join(' ')}
          aria-pressed={allTime}
        >
          За весь период
        </button>

        {presets
          .filter((p) => p.key !== 'all')
          .map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyRange(p.from!, p.to!)}
              className={[
                'h-9 rounded-lg px-3 text-[13px]',
                'border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/90',
                'outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30 transition font-medium',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
      </div>

      {/* Расширенный фильтр: поля дат + действия (по центру) */}
      {open && (
        <form
          onSubmit={onSubmit}
          className={[
            'mt-5',
            'grid items-center gap-3 md:gap-4',
            'grid-cols-1 md:grid-cols-[1fr_auto]',
          ].join(' ')}
        >
          <div className="grid grid-cols-2 gap-3">
            <input
              id="from"
              name="from"
              type="date"
              placeholder="Начало"
              defaultValue={initialFrom}
              disabled={allTime}
              ref={fromRef}
              className={[
                'h-10 w-full min-w-[150px] rounded-lg px-3',
                'bg-white/5 border border-white/12 outline-none',
                'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition',
                'appearance-none',
                allTime ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
              aria-label="Начало периода"
            />
            <input
              id="to"
              name="to"
              type="date"
              placeholder="Конец"
              defaultValue={initialTo}
              disabled={allTime}
              ref={toRef}
              className={[
                'h-10 w-full min-w-[150px] rounded-lg px-3',
                'bg-white/5 border border-white/12 outline-none',
                'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition',
                'appearance-none',
                allTime ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
              aria-label="Конец периода"
            />
          </div>

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
              href={resetHref}
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

          <style jsx global>{`
            .period-filter input[type='date']::-webkit-calendar-picker-indicator { display: none; }
            .period-filter input[type='date']::-webkit-inner-spin-button { display: none; }
            .period-filter input[type='date'] { -webkit-appearance: none; appearance: none; }
          `}</style>
        </form>
      )}
    </section>
  );
}
