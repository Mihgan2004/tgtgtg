// src/components/TotalsList.tsx
'use client';

import { useEffect, useState } from 'react';

interface Item { label: string; value: number; }
interface Section { title: string; unit?: string; items: Item[]; }

interface Props { sections: Section[]; }

export default function TotalsList({ sections }: Props) {
  useEffect(() => { console.log('📊 Detailed steps received:', sections); }, [sections]);
  const [allExpanded, setAllExpanded] = useState(false);

  const totalFields = sections.length;
  const totalLines = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-neutral-200">Детальная сводка</h2>
          <p className="text-xs text-neutral-500 mt-1">Распределение по всем шагам (с суммированием «шт» из подкатегорий)</p>
        </div>
        <div className="text-sm text-neutral-500">
          <span className="text-emerald-400 font-semibold">{totalFields}</span> шагов ·{' '}
          <span className="text-emerald-400 font-semibold">{totalLines}</span> позиций
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setAllExpanded(!allExpanded)} className="text-xs text-emerald-300 hover:underline">
          {allExpanded ? 'Свернуть все' : 'Развернуть все'}
        </button>
      </div>

      <div className="space-y-4">
        {sections.map((sec) => (
          <details key={sec.title} open={allExpanded} className="border border-white/5 rounded-xl overflow-hidden">
            <summary className="flex justify-between px-4 py-3 bg-camo-900/40 cursor-pointer hover:bg-camo-800/50">
              <h3 className="text-sm font-semibold tracking-wide text-neutral-300 uppercase">{sec.title}</h3>
              <div className="text-xs text-neutral-500">{sec.items.length} шт</div>
            </summary>
            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              {sec.items.map((it, iidx) => (
                <div key={`${sec.title}__${it.label}__${iidx}`} className="chip hover:bg-white/[0.03] transition-colors" title={it.label}>
                  <span className="truncate mr-2">{it.label}</span>
                  <span className="font-semibold font-mono text-emerald-300 num">
                    {it.value.toLocaleString('ru-RU')} {sec.unit ?? 'шт'}
                  </span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
