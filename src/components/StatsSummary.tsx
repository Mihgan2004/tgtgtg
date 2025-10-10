'use client';

import React, { memo, useMemo } from 'react';

/** Унифицированные строки для блока "По кодам доступа" */
type CodeCount = {
  id_code: string;   // то, что надо показывать (например, "260600")
  cnt: number;       // количество отчетов
};

type LegacyUserCount = {
  user_id?: string;           // старое поле — игнорируем в UI
  username?: string | null;   // старое поле — игнорируем в UI
  count?: number;             // старое поле — количество
  id_code?: string;           // если вдруг уже приходит
  cnt?: number;               // если вдруг уже приходит
};

type Step7Row = { label: string; value: number };

type Props = {
  totalReports?: number;
  /** Массив в любом из форматов: [{id_code,cnt}] ИЛИ [{user_id,username,count}] */
  userCounts?: LegacyUserCount[];
  step7Data?: Step7Row[];
  /** Показывать лоадер поверх содержимого */
  loading?: boolean;
  /** Сколько записей показывать в блоках */
  limitUsers?: number;
  limitStep7?: number;
};

const nf = new Intl.NumberFormat('ru-RU');

function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card min-h-[220px]">
      {title && (
        <div className="text-sm font-semibold text-neutral-200 mb-3">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function SkeletonRow() {
  return <div className="h-7 rounded bg-white/5 animate-pulse" />;
}

export default memo(function StatsSummary({
  totalReports = 0,
  userCounts = [],
  step7Data = [],
  loading = false,
  limitUsers = 10,
  limitStep7 = 15,
}: Props) {
  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  );

  // Нормализуем вход: хотим массив { id_code, cnt }
  const normalizedCodes: CodeCount[] = useMemo(() => {
    return (userCounts || [])
      .map((row) => {
        // предпочитаем явный id_code; если нет — используем user_id как запасной
        const id_code =
          (row.id_code ?? row.user_id ?? '').toString().trim() || 'Без значения';

        // количество может быть в cnt или count
        const cnt = typeof row.cnt === 'number'
          ? row.cnt
          : typeof row.count === 'number'
          ? row.count
          : 0;

        return { id_code, cnt };
      })
      // отбрасываем совсем пустые/нулевые записи
      .filter((r) => r.id_code && r.id_code !== 'Без значения')
      .sort((a, b) => b.cnt - a.cnt);
  }, [userCounts]);

  const topCodes = useMemo(
    () => normalizedCodes.slice(0, limitUsers),
    [normalizedCodes, limitUsers]
  );

  const topStep7 = useMemo(
    () =>
      (step7Data || [])
        .slice() // не мутируем props
        .sort((a, b) => b.value - a.value)
        .slice(0, limitStep7),
    [step7Data, limitStep7]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Основная сводка */}
      <SectionCard>
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-emerald-300 mb-1">
            {currentDate}
          </div>
          <div className="text-xs text-neutral-500 uppercase tracking-widest">
            Текущая дата
          </div>
        </div>

        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-neutral-400">Всего отчётов:</span>
            <span className="text-2xl font-bold text-white num">
              {nf.format(totalReports)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-neutral-500 uppercase tracking-widest mb-2">
              По кодам доступа:
            </div>

            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={`u-skel-${i}`} />
                ))}
              </>
            )}

            {!loading && topCodes.length === 0 && (
              <div className="text-sm text-neutral-500">Нет данных</div>
            )}

            {!loading &&
              topCodes.map((code) => (
                <div
                  key={code.id_code}
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-camo-900/30 hover:bg-camo-800/50 transition-colors"
                >
                  <span className="text-neutral-300 truncate mr-2">
                    {code.id_code}
                  </span>
                  <span className="font-semibold text-emerald-300 num">
                    {nf.format(code.cnt)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </SectionCard>

      {/* Сводка Шаг 7 (B-часть) */}
      <SectionCard title="Сводка по Шагу 7 (B-часть)">
        {loading && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={`s7-skel-${i}`} />
            ))}
          </>
        )}

        {!loading && topStep7.length === 0 && (
          <div className="text-sm text-neutral-500">Нет данных</div>
        )}

        {!loading && topStep7.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {topStep7.map((item, i) => (
              <div
                key={`step7-${i}-${item.label}`}
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-camo-900/30"
              >
                <span
                  className="text-neutral-300 truncate flex-1 mr-2"
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="font-semibold text-emerald-300 num whitespace-nowrap">
                  {nf.format(item.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
});
