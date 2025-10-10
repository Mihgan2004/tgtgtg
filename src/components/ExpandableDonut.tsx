'use client';

import { useMemo, useState } from 'react';
import DonutLite from '@/components/DonutLite';

type Slice = { label: string; value: number };

export default function ExpandableDonut({
  data,
  title,
  topN = 3,
}: {
  data: Slice[];
  title: string;
  topN?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  // сортируем по value desc
  const sorted = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-white/80">{title}</div>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
          >
            {expanded ? 'Свернуть' : 'Показать всё'}
          </button>
        )}
      </div>

      {/* компактная легенда (только топ-N) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70 mb-3">
        {top.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span className="opacity-70">•</span>
            <span className="truncate max-w-[13rem]" title={s.label}>{s.label}</span>
            <span className="opacity-60">— {s.value}</span>
          </span>
        ))}
        {!expanded && rest.length > 0 && (
          <span className="opacity-60">…</span>
        )}
      </div>

      {/* сам донат: в «свернутом» режиме оставляем showTopN, в раскрытом — всё */}
      <DonutLite
        data={sorted}
        title=""             // заголовок уже сверху
        showTopN={expanded ? sorted.length : topN}
        groupOthers={!expanded}
      />

      {/* при раскрытии — полная легенда списком снизу (необязательно) */}
      {expanded && rest.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/70">
          {rest.map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <span className="opacity-70">•</span>
              <span className="truncate" title={s.label}>{s.label}</span>
              <span className="ml-auto opacity-60">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}