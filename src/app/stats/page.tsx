// src/app/stats/page.tsx
import Tabs from '@/components/Tabs';
import StatsSummary from '@/components/StatsSummary';
import TotalsList from '@/components/TotalsList';
import DonutLite from '@/components/DonutLite';
import HorizontalBar from '@/components/HorizontalBar';
import PeriodFilterBar from '@/components/PeriodFilterBar';
import CodeFilterBar from '@/components/CodeFilterBar';

import {
  getFieldDistributionExtended,
  getTotalReportsCount,
  getAllowedUsersWithCounts,
  decodeBPart,
  targetExpr,
  resultExpr,
  bPartExpr as bPartExprFn,
  CREATED_DAY_EXPR,
  type Indicator,
} from '@/lib/queries';

import dynamic from 'next/dynamic';
const ExportModalIsland = dynamic(() => import('@/components/ExportModalIsland'), { ssr: true });

export const revalidate = 0;

/* ===================== МАППИНГИ ПОДПИСЕЙ ДЛЯ TARGET/RESULT ===================== */
const TARGET_MAIN_LABELS: Record<string, string> = {
  '1': 'Категория 1',
  '2': 'Категория 2',
  '3': 'Категория 3',
  '4': 'Категория 4',
  '5': 'Табак',
  '6': 'Категория 6',
  '7': 'Категория 7',
  '8': 'Категория 8',
  '9': 'Категория 9',
  '10': 'Категория 10',
  '11': 'Категория 11',
  '12': 'Категория 12',
};
const TARGET_HAS_SUB = new Set(['5', '6', '7', '8', '9']);
const TARGET_SUB_LABELS: Record<string, Record<string, string>> = {
  '5': { '1': 'Вэйп', '2': 'Сигареты', '3': 'Папироса', '4': 'Сигарилла' },
  '6': { '1': '6.1', '2': '6.2', '3': '6.3', '4': '6.4' },
  '7': { '1': '7.1', '2': '7.2', '3': '7.3', '4': '7.4' },
  '8': { '1': '8.1', '2': '8.2', '3': '8.3', '4': '8.4', '5': '8.5' },
  '9': { '1': '9.1', '2': '9.2', '3': '9.3', '4': '9.4' },
};

const RESULT_MAIN_LABELS: Record<string, string> = {
  '1': 'Категория R1',
  '2': 'Категория R2',
  '3': 'Категория R3',
  '4': 'Категория R4',
  '5': 'Категория R5',
  '6': 'Категория R6',
  '7': 'Категория R7',
  '8': 'Категория R8',
  '9': 'Категория R9',
};
const RESULT_HAS_SUB = new Set(['4', '5', '6']);
const RESULT_SUB_LABELS: Record<string, Record<string, string>> = {
  '4': { '1':'R4.1','2':'R4.2','3':'R4.3','4':'R4.4','5':'R4.5','6':'R4.6','7':'R4.7' },
  '5': { '1':'R5.1','2':'R5.2','3':'R5.3','4':'R5.4','5':'R5.5' },
  '6': { '1':'R6.1','2':'R6.2','3':'R6.3' },
};

/* ===================== УТИЛИТЫ ===================== */
function parseAll(sp: Record<string, string | string[] | undefined>) {
  const tab = ((sp.tab as string) || 'summary').trim();
  const user = ((sp.user as string) || '').trim();
  const rawFrom = sp.from as string | undefined;
  const rawTo = sp.to as string | undefined;
  const all = (sp.all as string) === '1';
  const from = rawFrom && rawFrom.trim() !== '' ? rawFrom : undefined;
  const to = rawTo && rawTo.trim() !== '' ? rawTo : undefined;
  return { tab, user, from, to, all };
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

type DistRow = { label: string; value?: number; count?: number; total?: number; reports?: number };
const toNum = (d: DistRow) => Number(d.value ?? d.count ?? d.total ?? d.reports ?? 0);

function decodeTargetCombined(label: string) {
  const [main, sub] = (label || '').split('::');
  if (TARGET_HAS_SUB.has(main) && sub) return TARGET_SUB_LABELS[main]?.[sub] ?? sub;
  return TARGET_MAIN_LABELS[main] ?? main;
}
function decodeResultCombined(label: string) {
  const [main, sub] = (label || '').split('::');
  if (RESULT_HAS_SUB.has(main) && sub) return RESULT_SUB_LABELS[main]?.[sub] ?? sub;
  return RESULT_MAIN_LABELS[main] ?? main;
}

/* ===================== B-ЧАСТЬ ===================== */
const MAIN_ALIASES: Record<string, string> = {
  'Тротиловом шашка 400 гр': 'Тротиловая шашка 400 гр',
  'ТБГ-7В (головная часть)': 'ТБГ-7В',
};
const norm = (m: string) => MAIN_ALIASES[m] ?? m;

const BPART_GROUPS: { key: string; mains: string[] }[] = [
  { key: 'ОФБЧ 2 кг / ОФБЧ 3 кг / ОФСП 2.5 кг', mains: ['ОФБЧ 2 кг', 'ОФБЧ 3 кг', 'ОФСП 2.5 кг'] },
  { key: 'СЗ-6 / ПВВ-7',                        mains: ['СЗ-6', 'ПВВ-7'] },
  { key: 'Тротиловая шашка 400 гр',             mains: ['Тротиловая шашка 400 гр'] },
  { key: 'КЗ-7 / ПГ7-ВР',                       mains: ['КЗ-7', 'ПГ7-ВР'] },
];

// ВАЖНО: латиница в названии
const KG_MAINS = new Set<string>(['Тротиловая шашка 400 гр', 'ТМ-62']);

function parseQty(text: string) {
  const s = (text || '').replace(',', '.').toLowerCase();
  const n = parseFloat(s.match(/[\d.]+/)?.[0] ?? '0');
  return { units: /шт/.test(s) ? n : 0, kg: /кг/.test(s) ? n : 0 };
}

type BMainTotals = Record<string, { units: number; kg: number }>;
function aggregateBPart(rows: DistRow[]): BMainTotals {
  const totals: BMainTotals = {};
  for (const r of rows) {
    const [rawMain, sub1, sub2] = (r.label || '').split('::');
    if (!rawMain) continue;
    const main = norm(rawMain);
    const cnt = toNum(r);

    let qty = '';
    if (main === 'ТМ-62' && sub1 && sub2) {
      qty = decodeBPart(rawMain, `${sub1}::${sub2}`);
    } else if (KG_MAINS.has(main) && sub1) {
      qty = decodeBPart(rawMain, sub1);
    } else if (sub1) {
      qty = decodeBPart(rawMain, sub1);
    } else {
      qty = '1 шт.';
    }

    const { units, kg } = parseQty(qty);
    const addUnits = KG_MAINS.has(main) ? 0 : (units || 1);
    const addKg = KG_MAINS.has(main) ? kg : 0;

    if (!totals[main]) totals[main] = { units: 0, kg: 0 };
    totals[main].units += addUnits * cnt;
    totals[main].kg += addKg * cnt;
  }
  return totals;
}

const MAIN_DISPLAY_ORDER = [
  'ОФБЧ 2 кг','ОФБЧ 3 кг','ОФСП 2.5 кг','СЗ-6','ПВВ-7','Тротиловая шашка 400 гр',
  'КЗ-7','ПГ7-ВР','СЗ-3А','КЗ-6','ТБГ-7В','ТМ-62','Д-105',
];

/* ===================== PAGE ===================== */
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const parsed = parseAll(sp);

  // По умолчанию — только сегодня (если не задан диапазон и не all=1)
  let { tab, user } = parsed;
  let from = parsed.from;
  let to = parsed.to;
  let all = parsed.all;
  if (!all && !from && !to) {
    const today = todayStr();
    from = today; to = today;
  }

  const isUsers = tab === 'users';
  const isSummary = tab === 'summary';

  // Данные
  const allowedUsers = await getAllowedUsersWithCounts(from, to, all);
  const users = allowedUsers.map((u) => ({
    id_code: String(u.id_code),   // ← берём КОД ДОСТУПА
    cnt: Number(u.cnt) || 0,      // ← счётчик из поля cnt
  }));
  const scope: Record<string, any> = isUsers && user ? { id_code: user } : {};
  const bpartExpr = bPartExprFn();
  const step4TypeField = 'type_choice' as Indicator;

  const [
    targetCombined, bpartCombined, resultCombined, step4TypeData, totalReports,
    step1IdCode, step2Date, step3Number, step5Coords, step6Freq, dopvCombined, vvCombined,
  ] = await Promise.all([
    getFieldDistributionExtended(targetExpr(), scope, from, to, all, 200),
    getFieldDistributionExtended(bpartExpr, scope, from, to, all, 200),
    getFieldDistributionExtended(resultExpr(), scope, from, to, all, 200),
    getFieldDistributionExtended(step4TypeField, scope, from, to, all, 50),
    getTotalReportsCount(scope, from, to, all),

    getFieldDistributionExtended('id_code', scope, from, to, all, 9999),
    getFieldDistributionExtended(CREATED_DAY_EXPR, scope, from, to, all, 9999),
    getFieldDistributionExtended('number_n', scope, from, to, all, 9999),
    getFieldDistributionExtended('coords', scope, from, to, all, 9999),
    getFieldDistributionExtended('freq', scope, from, to, all, 9999),
    getFieldDistributionExtended("COALESCE(dopv_main,'') || '::' || COALESCE(dopv_sub,'')", scope, from, to, all, 9999),
    getFieldDistributionExtended("COALESCE(vv_main,'')   || '::' || COALESCE(vv_sub,'')",   scope, from, to, all, 9999),
  ]);

  // Слайсы
  type Slice = { label: string; value: number };
  const step10Slices: Slice[] = (targetCombined as DistRow[]).map((r) => ({
    label: decodeTargetCombined(r.label), value: toNum(r),
  }));
  const resultSlices: Slice[] = (resultCombined as DistRow[]).map((r) => ({
    label: decodeResultCombined(r.label), value: toNum(r),
  }));
  const step4TypeSlices: Slice[] = (step4TypeData as DistRow[]).map((r) => ({
    label: r.label, value: toNum(r),
  }));

  // В-часть — агрегаты
  const byMain = aggregateBPart(bpartCombined as DistRow[]);
  const covered = new Set(BPART_GROUPS.flatMap((g) => g.mains.map(norm)));
  const lineRows = BPART_GROUPS.map((g) => {
    let u = 0, k = 0;
    g.mains.forEach((m) => {
      const mm = norm(m); const t = byMain[mm];
      if (t) { u += t.units; k += t.kg; }
    });
    const isKgOnly = g.mains.every((m) => KG_MAINS.has(norm(m)));
    return { label: g.key, value: isKgOnly ? k : u };
  });
  const otherMains = Object.keys(byMain).filter((m) => !covered.has(m));
  let otherUnits = 0, otherKg = 0;
  otherMains.forEach((m) => { otherUnits += byMain[m].units; otherKg += byMain[m].kg; });
  const otherValue = otherUnits === 0 ? otherKg : otherUnits;
  const otherLabel = otherMains.length ? `Другое (${otherMains.join(', ')})` : 'Другое (нет)';
  lineRows.push({ label: otherLabel, value: otherValue });

  const summaryBPartList: Slice[] = MAIN_DISPLAY_ORDER.map((name) => {
    const m = norm(name); const t = byMain[m];
    return { label: m, value: t ? (KG_MAINS.has(m) ? t.kg : t.units) : 0 };
  });

  const bpartGroupSlices: Slice[] = lineRows.map((r) => ({ label: r.label, value: r.value }));

  const toItems = (rows: DistRow[]) =>
    rows.map((r) => ({ label: String(r.label || '—'), value: toNum(r) }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));

  const step1Items = toItems(step1IdCode as DistRow[]);
  const step2Items = toItems(step2Date as DistRow[]);
  const step3Items = toItems(step3Number as DistRow[]);
  const step4Items = toItems(step4TypeData as DistRow[]);
  const step5Items = toItems(step5Coords as DistRow[]);
  const step6Items = toItems(step6Freq as DistRow[]);

  const sumByMain = (rows: DistRow[], decodeLabel?: (main: string, sub?: string) => string) => {
    const acc = new Map<string, number>();
    for (const r of rows) {
      const [main, sub] = (r.label || '').split('::');
      if (!main) continue;
      const key = (decodeLabel ? decodeLabel(main, sub) : main) || main;
      acc.set(key, (acc.get(key) || 0) + toNum(r));
    }
    return Array.from(acc.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));
  };

  const step7BPartItems = MAIN_DISPLAY_ORDER
    .map((m) => {
      const t = byMain[m] || { units: 0, kg: 0 };
      const value = KG_MAINS.has(m) ? t.kg : t.units;
      return { label: m, value };
    })
    .filter((x) => x.value > 0);

  const step8Items  = sumByMain(dopvCombined as DistRow[]);
  const step9Items  = sumByMain(vvCombined as DistRow[]);
  const step10Items = sumByMain(targetCombined as DistRow[], (main, sub) =>
    decodeTargetCombined(`${main}${sub ? `::${sub}` : ''}`),
  );
  const step11Items = sumByMain(resultCombined as DistRow[], (main, sub) =>
    decodeResultCombined(`${main}${sub ? `::${sub}` : ''}`),
  );

  /* ===================== RENDER (только UI) ===================== */
  return (
    <main className="max-w-[1400px] mx-auto px-5 md:px-8 space-y-4 md:space-y-6">
      <header className="pt-3">
      <div className="mb-4 flex items-center justify-between">
        <Tabs /> {/* в этом компоненте уже табы и кнопка Экспорт */}
      </div>
      </header>

      <section
        className={
          // в users — всегда одна колонка, чтобы исключить налезание;
          // в summary — период на всю ширину.
          isUsers ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'
        }
      >
        <div className={!isUsers ? 'md:col-span-2' : ''}>
          <div className="card p-3">
            <PeriodFilterBar
              initialFrom={from || ''}
              initialTo={to || ''}
              initialAll={!!all}
              resetHref={isUsers ? '/stats?tab=users' : '/stats'}
            />
          </div>
        </div>

        {isUsers && (
          <div className="w-full">
            <div className="card p-3">
              <CodeFilterBar initialUser={user} />
            </div>
          </div>
        )}
      </section>
        {isSummary && (
          <section className="mt-2">
            <StatsSummary
              totalReports={Number(totalReports) || 0}
              userCounts={users}
              step7Data={summaryBPartList}
            />
          </section>
        )}


      {/* Ряд 1: донаты — без заголовков в карточках */}
      <section className="charts-row">
        <div className="chart-card">
          <DonutLite title="Шаг 10" data={step10Slices} showTopN={3} groupOthers />
        </div>
        <div className="chart-card">
        <DonutLite title="Результат" data={resultSlices} showTopN={3} groupOthers />
        </div>
      </section>

      {/* Ряд 2: В-часть суммарно + Типы */}
      <section className="charts-row">
        <div className="chart-card chart-340">
        <DonutLite title="В-часть · линии (суммы)" data={bpartGroupSlices} showTopN={5} groupOthers />
        </div>
        <div className="chart-card chart-340">
          <HorizontalBar data={step4TypeSlices} title="" showTopN={6} />
        </div>
      </section>

      {/* Детальная сводка */}
      <section>
        <TotalsList
          sections={[
            { title: 'Шаг 1 · Код доступа (id_code)', items: step1Items },
            { title: 'Шаг 2 · Дата (по created_at, день)', items: step2Items },
            { title: 'Шаг 3 · Номер (number_n)', items: step3Items },
            { title: 'Шаг 4 · Тип (type_choice)', items: step4Items },
            { title: 'Шаг 5 · Координаты', items: step5Items },
            { title: 'Шаг 6 · Частота (freq)', items: step6Items },
            { title: 'Шаг 7 · B-часть (суммирование подкатегорий)', items: step7BPartItems },
            { title: 'Шаг 8 · Доп.в (main + sub → main)', items: step8Items },
            { title: 'Шаг 9 · ВВ (main + sub → main)', items: step9Items },
            { title: 'Шаг 10 · Target (main/sub → main)', items: step10Items },
            { title: 'Шаг 11 · Result (main/sub → main)', items: step11Items },
          ]}
        />
      </section>

      <ExportModalIsland />
    </main>
  );
}
