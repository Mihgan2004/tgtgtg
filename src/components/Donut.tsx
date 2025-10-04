'use client';
import { useMemo } from 'react';

export interface Slice {
  label: string;
  value: number;
}

interface Props {
  data: Slice[];
  /** Оставлено для совместимости — не используется */
  caption?: string;
}

const COLORS = [
  '#b91c1c', // бордовый (red-700)
  '#e35d5b', // тёплый красный (как ободок)
  '#8a7d2d', // оливковый
  '#d4b02a', // горчица
  '#6f1d1b', // тёмный бордовый для длинных списков
  '#ffb703', // светлая горчица/оранж.
  '#9a8a2e', // ещё одна олива
  '#f0d356', // светлая горчица
];

export default function Donut({ data }: Props) {
  const { slices, total, centerText } = useMemo(() => {
    if (!data || data.length === 0) {
      return { slices: [] as any[], total: 0, centerText: '0' };
    }

    const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
    if (total === 0) {
      return { slices: [] as any[], total: 0, centerText: '0' };
    }

    let currentAngle = -90; // начинаем с верха
    const slices = data.map((d, i) => {
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

    return {
      slices,
      total,
      centerText: total.toLocaleString('ru-RU'),
    };
  }, [data]);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-500">
        <svg className="w-12 h-12 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="text-sm">Нет данных</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full h-full max-w-full">
      {/* SVG диаграмма */}
      <div className="relative" style={{ width: '160px', height: '160px' }}>
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
          {/* внешнее кольцо — лёгкая тень */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="30"
            opacity="0.3"
          />

          {/* сегменты */}
          {slices.map((slice: any, i: number) => {
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
              'Z',
            ].join(' ');

            return (
              <g key={`slice-${i}`}>
                <path
                  d={pathData}
                  fill={slice.color}
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                  style={{
                    animation: `pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                    animationDelay: `${i * 0.1}s`,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                >
                  <title>{`${slice.label}: ${slice.value} (${slice.percent.toFixed(1)}%)`}</title>
                </path>
              </g>
            );
          })}

          {/* внутренний круг */}
          <circle
            cx="100"
            cy="100"
            r="50"
            fill="#0b1b12"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        </svg>

        {/* центральный текст — только число */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="text-2xl font-bold text-emerald-300 num"
            style={{ animation: 'pop 0.8s ease 0.3s both' }}
          >
            {centerText}
          </div>
          {/* подпись убрана намеренно */}
        </div>
      </div>

      {/* легенда */}
      <div className="mt-4 w-full space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
        {slices.map((slice: any, i: number) => (
          <div
            key={`legend-${i}`}
            className="flex items-center gap-2 text-xs group cursor-pointer hover:bg-camo-700/30 px-2 py-1 rounded transition-colors"
            style={{ animation: 'rise 0.4s ease both', animationDelay: `${0.4 + i * 0.05}s` }}
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ backgroundColor: slice.color }}
            />
            <div
              className="flex-1 min-w-0 truncate text-neutral-300 group-hover:text-white transition-colors"
              title={slice.label}
            >
              {slice.label}
            </div>
            <div className="text-neutral-400 num whitespace-nowrap">
              {slice.percent.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
