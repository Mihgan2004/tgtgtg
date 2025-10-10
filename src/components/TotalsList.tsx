// src/components/TotalsList.tsx
'use client';

import { useMemo, useState } from 'react';

interface Item { label: string; value: number; }
interface Section { title: string; unit?: string; items: Item[]; }
interface Props { sections: Section[]; }

export default function TotalsList({ sections }: Props) {
  const [allExpanded, setAllExpanded] = useState(false);

  const { totalFields, totalLines } = useMemo(() => {
    const fields = sections.length;
    const lines = sections.reduce((acc, s) => acc + s.items.length, 0);
    return { totalFields: fields, totalLines: lines };
  }, [sections]);

  return (
    <section className="card">
      {/* Header */}
      <div className="mb-5 pb-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[20px] sm:text-[22px] font-semibold text-neutral-100 leading-tight">
              Детальная сводка
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-white/55">
              Распределение по всем шагам (с суммированием «шт» из подкатегорий)
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[12px] text-white/60">шагов · позиций</div>
            <div className="text-[15px] font-semibold tabular-nums">
              <span className="text-emerald-400">{totalFields}</span>
              <span className="text-white/45"> · </span>
              <span className="text-emerald-400">{totalLines}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={() => setAllExpanded((v) => !v)}
            className="text-[12px] text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline"
          >
            {allExpanded ? 'Свернуть все' : 'Развернуть все'}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((sec) => {
          const unit = sec.unit ?? 'шт';
          return (
            <details
              key={sec.title}
              open={allExpanded}
              className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden"
            >
              <summary className="list-none">
                <div className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none hover:bg-white/[0.03]">
                  <h3 className="text-[13px] sm:text-[14px] font-medium text-neutral-200">
                    {sec.title}
                  </h3>
                  <div className="text-[12px] text-white/60 tabular-nums">
                    {sec.items.length} поз.
                  </div>
                </div>
              </summary>

              {sec.items.length === 0 ? (
                <div className="px-4 py-3 text-sm text-white/50">Нет данных</div>
              ) : (
                <div className="px-2 pb-3">
                  {/* На мобилке одна колонка, со sm — две */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sec.items.map((it, iidx) => (
                      <div
                        key={`${sec.title}__${it.label}__${iidx}`}
                        className={[
                          'rounded-lg border border-white/10 bg-white/[0.015]',
                          'px-3 py-2.5',
                          'hover:bg-white/[0.04] transition-colors',
                          'flex items-baseline justify-between gap-2',
                        ].join(' ')}
                        title={it.label}
                      >
                        <span className="text-[13px] sm:text-[13px] text-neutral-300 truncate">
                          {it.label}
                        </span>

                        <span className="text-[13px] sm:text-[14px] font-semibold text-emerald-300 tabular-nums">
                          {it.value.toLocaleString('ru-RU')}{' '}
                          <span className="ml-0.5 text-[11px] font-normal text-emerald-200/80">
                            {unit}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
