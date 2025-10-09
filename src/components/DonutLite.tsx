'use client';
import { useMemo, useState } from 'react';

export interface SliceLite {
  label: string;
  value: number;
  description?: string; // Полное описание для tooltip
}

interface Props {
  data: SliceLite[];
  title: string;
  showTopN?: number; // Сколько показывать по умолчанию (3)
  groupOthers?: boolean; // Группировать остальные
}

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

export default function DonutLite({ data, title, showTopN = 3, groupOthers = true }: Props) {
  const [showAll, setShowAll] = useState(false);

  const { slices, total, displaySlices } = useMemo(() => {
    if (!data || data.length === 0) {
      return { slices: [], total: 0, displaySlices: [] };
    }

    const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
    if (total === 0) {
      return { slices: [], total: 0, displaySlices: [] };
    }

    // Сортируем по убыванию
    const sorted = [...data].sort((a, b) => b.value - a.value);

    // Группируем если нужно
    let processedData: SliceLite[] = sorted;
    if (groupOthers && sorted.length > showTopN && !showAll) {
      const top = sorted.slice(0, showTopN);
      const others = sorted.slice(showTopN);
      const othersSum = others.reduce((sum, d) => sum + d.value, 0);
      
      if (othersSum > 0) {
        processedData = [...top, { label: 'Прочие', value: othersSum, description: `${others.length} вариантов` }];
      } else {
        processedData = top;
      }
    }

    // Создаём слайсы для SVG
    let currentAngle = -90;
    const slices = processedData.map((d, i) => {
      const percent = (d.value / total) * 100;
      const angle = (d.value / total) * 360;
      const slice = {
        ...d,
        percent,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: COLORS[i % COLORS.length],
      };
      currentAngle += angle;
      return slice;
    });

    return { slices, total, displaySlices: processedData };
  }, [data, showAll, showTopN, groupOthers]);

  if (total === 0) {
    return (
      <div className="card h-[300px] flex items-center justify-center text-neutral-500 text-sm">
        Нет данных
      </div>
    );
  }

  return (
    <div className="card h-auto">
      <div className="text-xs uppercase tracking-widest text-neutral-400 mb-3">
        {title}
      </div>

      <div className="flex flex-col items-center">
        {/* Компактная диаграмма */}
        <div className="relative" style={{ width: '140px', height: '140px' }}>
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
            <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="30" opacity="0.3" />
            
            {slices.map((slice, i) => {
              const startAngle = (slice.startAngle * Math.PI) / 180;
              const endAngle = (slice.endAngle * Math.PI) / 180;
              const innerRadius = 55;
              const outerRadius = 85;
              
              const x1 = 100 + innerRadius * Math.cos(startAngle);
              const y1 = 100 + innerRadius * Math.sin(startAngle);
              const x2 = 100 + outerRadius * Math.cos(startAngle);
              const y2 = 100 + outerRadius * Math.sin(startAngle);
              const x3 = 100 + outerRadius * Math.cos(endAngle);
              const y3 = 100 + outerRadius * Math.sin(endAngle);
              const x4 = 100 + innerRadius * Math.cos(endAngle);
              const y4 = 100 + innerRadius * Math.sin(endAngle);
              
              const largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0;
              const pathData = [
                `M ${x1} ${y1}`,
                `L ${x2} ${y2}`,
                `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3}`,
                `L ${x4} ${y4}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}`,
                'Z'
              ].join(' ');
              
              return (
                <g key={`slice-${i}`}>
                  <path d={pathData} fill={slice.color} className="transition-opacity hover:opacity-80">
                    <title>{`${slice.label}: ${slice.value} (${slice.percent.toFixed(1)}%)`}</title>
                  </path>
                </g>
              );
            })}
            
            <circle cx="100" cy="100" r="50" fill="#0a1510" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-xl font-bold text-emerald-300 num">
              {total}
            </div>
          </div>
        </div>

        {/* Компактная легенда */}
        <div className="mt-3 w-full space-y-1">
          {displaySlices.slice(0, showAll ? undefined : showTopN + 1).map((slice, i) => (
            <div key={`legend-${i}`} className="flex items-center gap-2 text-xs px-2 py-1">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: slices[i]?.color }} />
              <div className="flex-1 min-w-0 truncate text-neutral-300" title={slice.description || slice.label}>
                {slice.label}
              </div>
              <div className="text-neutral-400 num text-[10px]">
                {((slice.value / total) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        {/* Кнопка "Показать всё" */}
        {groupOthers && data.length > showTopN && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 px-3 py-1 text-xs rounded-md bg-camo-700/50 hover:bg-camo-600 text-neutral-300 transition-colors"
          >
            {showAll ? '← Свернуть' : `Показать всё (${data.length})`}
          </button>
        )}
      </div>
    </div>
  );
}