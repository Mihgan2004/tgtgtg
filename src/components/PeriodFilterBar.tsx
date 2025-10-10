// src/components/PeriodFilterBar.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  initialFrom?: string;
  initialTo?: string;
  initialAll?: boolean;
  resetHref: string; // игнорируем прямой переход — сбрасываем через JS
};

export default function PeriodFilterBar({
  initialFrom = '',
  initialTo = '',
  initialAll = false,
}: Props) {
  const [allTime, setAllTime] = useState<boolean>(!!initialAll);
  const [open, setOpen] = useState(false);

  useEffect(() => setAllTime(!!initialAll), [initialAll]);

  const presets = useMemo(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const add = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d;
    };
    const qStart = () => new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    const yStart = () => new Date(today.getFullYear(), 0, 1);
    return [
      { key: 'all', label: 'За весь период' as const },
      { key: 't', label: 'Сегодня', from: fmt(today), to: fmt(today) },
      { key: '7', label: '7 дней', from: fmt(add(-6)), to: fmt(today) },
      { key: '30', label: '30 дней', from: fmt(add(-29)), to: fmt(today) },
      { key: 'q', label: 'Квартал', from: fmt(qStart()), to: fmt(today) },
      { key: 'y', label: 'Год', from: fmt(yStart()), to: fmt(today) },
    ] as const;
  }, []);

  const writeSearch = useCallback((from?: string, to?: string, all?: boolean) => {
    const qs = new URLSearchParams(window.location.search);
    const tab = qs.get('tab') || undefined;
    const user = qs.get('user') || undefined;

    // чистим старые ключи
    ['from', 'to', 'all'].forEach((k) => qs.delete(k));

    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (all) qs.set('all', '1');
    if (tab) qs.set('tab', tab);
    if (user) qs.set('user', user);

    window.location.search = qs.toString();
  }, []);

  const applyAll = () => { setAllTime(true); writeSearch(undefined, undefined, true); };
  const applyRange = (from: string, to: string) => { setAllTime(false); writeSearch(from, to, false); };
  const resetAll = () => {
    const qs = new URLSearchParams(window.location.search);
    const tab = qs.get('tab') || undefined;
    // оставляем только tab
    const next = new URLSearchParams();
    if (tab) next.set('tab', tab);
    window.location.search = next.toString();
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const from = String(fd.get('from') || '').trim();
    const to = String(fd.get('to') || '').trim();
    const all = !!fd.get('all');
    writeSearch(from || undefined, to || undefined, all);
  };

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
        <button
          type="button"
          onClick={applyAll}
          className={[
            'h-9 rounded-lg px-3 text-[13px] font-medium',
            allTime
              ? 'bg-emerald-500/90 text-black border border-emerald-400'
              : 'border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/90',
          ].join(' ')}
          aria-pressed={allTime}
        >
          За весь период
        </button>
        {presets.filter(p => p.key !== 'all').map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyRange(p.from!, p.to!)}
            className="h-9 rounded-lg px-3 text-[13px] font-medium border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/90"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Расширенный: построчно строго вниз */}
      {open && (
        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3">
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={initialFrom}
            disabled={allTime}
            className={[
              'h-11 w-full rounded-lg px-3',
              'bg-white/5 border border-white/12 outline-none',
              'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition',
              allTime ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            aria-label="Дата от"
          />
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={initialTo}
            disabled={allTime}
            className={[
              'h-11 w-full rounded-lg px-3',
              'bg-white/5 border border-white/12 outline-none',
              'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition',
              allTime ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            aria-label="Дата до"
          />
          <input type="hidden" name="all" value={allTime ? '1' : ''} />

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/15 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
          >
            ✓ Применить
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.02] hover:bg-white/[0.07] text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/25"
          >
            ↺ Сбросить
          </button>
        </form>
      )}
    </section>
  );
}
