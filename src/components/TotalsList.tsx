'use client';
import { useEffect } from 'react';

interface Item {
  label: string;
  value: number;
}

interface Props {
  items: Item[];
}

export default function TotalsList({ items }: Props) {
  useEffect(() => {
    console.log('📊 TotalsList received:', items);
  }, [items]);

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-200">Сводка по всем показателям</h2>
        <div className="text-xs text-neutral-500">Всего: {items.length} полей</div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <div 
            key={item.label}
            className="p-3 rounded-lg bg-camo-900/50 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-[0_0_15px_rgba(47,96,71,0.2)]"
            style={{
              animation: 'rise 0.4s ease both',
              animationDelay: `${Math.min(idx * 0.03, 1)}s`
            }}
          >
            <div className="text-xs text-neutral-400 mb-1 truncate" title={item.label}>
              {item.label}
            </div>
            <div className="text-2xl font-bold text-emerald-300 num">
              {item.value.toLocaleString('ru-RU')}
            </div>
          </div>
        ))}
      </div>
      
      {/* Временный debug блок */}
      {items.every(i => i.value === 0) && (
        <div className="mt-4 p-4 rounded-lg bg-amber-900/20 border border-amber-500/30 text-sm text-amber-300">
          ⚠️ Все значения = 0. Проверьте функцию <code className="bg-amber-900/30 px-1 rounded">getTotalsCommon()</code> в lib/queries.ts
        </div>
      )}
    </section>
  );
}