'use client';
import { useState, useMemo } from 'react';

interface BarItem {
  label: string;
  value: number;
  description?: string;
}

interface Props {
  data: BarItem[];
  title: string;
  showTopN?: number;
}

export default function HorizontalBar({ data, title, showTopN = 5 }: Props) {
  const [showAll, setShowAll] = useState(false);

  const { items, total, maxValue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { items: [], total: 0, maxValue: 0 };
    }

    const sorted = [...data].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, d) => sum + d.value, 0);
    const maxValue = Math.max(...sorted.map(d => d.value));

    const displayed = showAll ? sorted : sorted.slice(0, showTopN);

    return { items: displayed, total, maxValue };
  }, [data, showAll, showTopN]);

  if (total === 0) {
    return (
      <div className="card h-[300px] flex items-center justify-center text-neutral-500 text-sm">
        Нет данных
      </div>
    );
  }

  return (
    <div className="card">
      <div className="text-xs uppercase tracking-widest text-neutral-400 mb-3">
        {title}
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const percent = (item.value / total) * 100;
          const widthPercent = (item.value / maxValue) * 100;

          return (
            <div key={`bar-${i}`} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-neutral-300 truncate flex-1 mr-2" title={item.description || item.label}>
                  {item.label}
                </span>
                <span className="text-neutral-400 num whitespace-nowrap">
                  {item.value} ({percent.toFixed(1)}%)
                </span>
              </div>
              
              <div className="h-6 bg-camo-900/50 rounded-md overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-md transition-all duration-300 flex items-center px-2"
                  style={{ width: `${widthPercent}%` }}
                >
                  {widthPercent > 15 && (
                    <span className="text-xs font-semibold text-white num">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.length > showTopN && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full px-3 py-1.5 text-xs rounded-md bg-camo-700/50 hover:bg-camo-600 text-neutral-300 transition-colors"
        >
          {showAll ? '← Свернуть' : `Показать всё (${data.length})`}
        </button>
      )}
    </div>
  );
}