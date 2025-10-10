// src/components/Tabs.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback } from 'react';

export default function Tabs() {
  const params = useSearchParams();
  const currentTab = params.get('tab') ?? 'summary';

  const tabs = [
    { id: 'summary', label: 'Общий отчёт' },
    { id: 'users',   label: 'По пользователям' },
  ] as const;

  const makeHref = (nextTab: string) => {
    const qs = new URLSearchParams(Array.from(params.entries()));
    qs.set('tab', nextTab);
    return `/stats?${qs.toString()}`;
  };

  const openExport = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-export-modal'));
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <nav
        role="tablist"
        className={[
          'inline-flex min-w-0 items-center gap-1 p-1',
          'rounded-xl border border-white/10 bg-white/[0.03]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm',
          'overflow-x-auto no-scrollbar',
        ].join(' ')}
      >
        {tabs.map((t) => {
          const active = currentTab === t.id;
          return (
            <Link
              key={t.id}
              href={makeHref(t.id)}
              role="tab"
              aria-selected={active}
              className={[
                'inline-flex items-center justify-center leading-none',
                'h-9 px-4 sm:px-5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200',
                'outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40',
                active
                  ? 'bg-emerald-500/90 text-black shadow-md shadow-emerald-500/20'
                  : 'text-white/75 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Экспорт — всегда понятная кнопка с текстом */}
      <button
        type="button"
        onClick={openExport}
        className={[
          'inline-flex items-center justify-center leading-none',
          'h-9 px-4 rounded-lg text-sm font-medium',
          'border border-white/12 bg-white/[0.02] text-white/90',
          'hover:bg-white/10 hover:text-white transition-colors',
          'outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30',
        ].join(' ')}
        aria-label="Открыть экспорт"
      >
        ⭳ Экспорт
      </button>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </div>
  );
}
