'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function Tabs() {
  const params = useSearchParams();
  const tab = params.get('tab') ?? 'summary';

  const tabs = [
    { id: 'summary', label: 'Общий отчёт' },
    { id: 'users', label: 'По пользователям' },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-camo-800/50 border border-white/5 backdrop-blur-sm">
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <Link
            key={t.id}
            href={`/stats?tab=${t.id}`}
            className={`
              px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${active 
                ? 'bg-emerald-600/80 text-white shadow-md' 
                : 'text-neutral-300 hover:text-white hover:bg-camo-700/50'
              }
            `}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}