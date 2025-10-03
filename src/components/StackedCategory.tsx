'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
const Bar = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr:false });

type CatTop = { name: string; cnt: number };
type CatDaily = { day: string; name: string; cnt: number };

export default function StackedCategory(
  { title, data }:
  { title: string; data: { top: CatTop[]; daily: CatDaily[] } }
) {
  const labels = useMemo(() => Array.from(new Set(data.daily.map(d => d.day))), [data.daily]);
  const names  = useMemo(() => Array.from(new Set(data.daily.map(d => d.name ?? '(null)'))), [data.daily]);

  const datasets = useMemo(() => {
    return names.map((n) => {
      const byDay = new Map(data.daily.filter(d => (d.name ?? '(null)') === n).map(d => [d.day, d.cnt]));
      return { label: n, data: labels.map(day => byDay.get(day) ?? 0), stack: 'one' as const };
    });
  }, [names, labels, data.daily]);

  return (
    <div className="rounded-hud border border-line-soft bg-bg-card p-4">
      <div className="mb-3 font-semibold">{title}</div>
      <Bar data={{ labels, datasets }} options={{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top' } },
        scales:{ x:{ stacked:true }, y:{ stacked:true, beginAtZero:true } }
      }} height={260}/>
      <ul className="mt-3 text-sm">
        {data.top.map(x => (
          <li key={`${title}-${x.name}`} className="flex justify-between">
            <span className="truncate">{x.name ?? '(null)'}</span>
            <span className="font-mono">{x.cnt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
