// src/components/TotalsList.tsx
'use client';

import { useEffect } from 'react';

interface Item {
  label: string;
  value: number;
}
interface Section {
  title: string;     // название шага, например "B-часть (основная)"
  unit?: string;     // "шт" по умолчанию
  items: Item[];     // пары "значение" -> "сумма/кол-во"
}

interface Props {
  sections: Section[];  // <-- принимаем секции (11 шагов)
}

export default function TotalsList({ sections }: Props) {
  useEffect(() => {
    console.log('📊 Detailed steps received:', sections);
  }, [sections]);

  const totalFields = sections.length;
  const totalLines = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-neutral-200">Детальная сводка</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Распределение по всем шагам (с суммированием «шт» из подкатегорий)
          </p>
        </div>
        <div className="text-sm text-neutral-500">
          <span className="text-emerald-400 font-semibold">{totalFields}</span> шагов ·{' '}
          <span className="text-emerald-400 font-semibold">{totalLines}</span> позиций
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((sec, sidx) => (
          <div
            key={sec.title}
            style={{ animation: 'rise 0.35s ease both', animationDelay: `${Math.min(sidx * 0.04, 0.6)}s` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-neutral-300 uppercase">
                {sec.title}
              </h3>
              <div className="text-xs text-neutral-500">{sec.items.length} поз.</div>
            </div>

            <div className="rounded-xl border border-white/5 bg-camo-900/40 p-3">
              <ul className="divide-y divide-white/5">
                {sec.items.map((it, iidx) => (
                  <li
                    key={`${sec.title}__${it.label}__${iidx}`}
                    className="py-2 flex items-center justify-between hover:bg-white/[0.03] rounded-lg px-2 transition-colors"
                    style={{ animation: 'rise 0.3s ease both', animationDelay: `${Math.min(iidx * 0.01, 0.4)}s` }}
                  >
                    <span className="text-sm text-neutral-300 truncate" title={it.label}>
                      {it.label}
                    </span>
                    <span className="text-sm font-semibold text-emerald-300">
                      {it.value.toLocaleString('ru-RU')} {sec.unit ?? 'шт'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Пустой шаг — подсветка (для отладки) */}
            {sec.items.length === 0 && (
              <div className="mt-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-500/30 rounded-lg p-2">
                Нет данных для шага «{sec.title}».
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
