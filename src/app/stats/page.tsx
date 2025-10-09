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

// Текущий день как YYYY-MM-DD (UTC); если нужна другая TZ — можно сместить.
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

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

/* ===================== B-ЧАСТЬ: линии и суммирование подкатегорий ===================== */

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
  'ОФБЧ 2 кг',
  'ОФБЧ 3 кг',
  'ОФСП 2.5 кг',
  'СЗ-6',
  'ПВВ-7',
  'Тротиловая шашка 400 гр',
  'КЗ-7',
  'ПГ7-ВР',
  'СЗ-3А',
  'КЗ-6',
  'ТБГ-7В',
  'ТМ-62',
  'Д-105',
];

/* ===================== PAGE ===================== */

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next 15 — обязательно await
  const sp = await searchParams;
  const parsed = parseAll(sp);

  // ❗ По умолчанию — ТОЛЬКО СЕГОДНЯ.
  // Если пользователь явно не включил all=1 и не задал диапазон,
  // применяем фильтр текущей датой.
  let { tab, user } = parsed;
  let from = parsed.from;
  let to = parsed.to;
  let all = parsed.all;

  if (!all && !from && !to) {
    const today = todayStr();
    from = today;
    to = today;
  }

  const isUsers = tab === 'users';

  // Список кодов доступа с количеством (для карточки)
  const allowedUsers = await getAllowedUsersWithCounts(from, to, all);
  const users = (allowedUsers as any[]).map((u) => ({
    user_id: String(u.user_id),
    username: u.username ?? null,
    count: Number(u.count) || 0,
  }));

  const scope: Record<string, any> = isUsers && user ? { id_code: user } : {};

  const bpartExpr = bPartExprFn();
  const step4TypeField = 'type_choice' as Indicator;

  const [
    targetCombined,
    bpartCombined,
    resultCombined,
    step4TypeData,
    totalReports,

    // Доп. поля для 11 шагов
    step1IdCode,
    step2Date,
    step3Number,
    step5Coords,
    step6Freq,
    dopvCombined,
    vvCombined,
  ] = await Promise.all([
    // диаграммы и карточки (все уже в рамках from/to/all)
    getFieldDistributionExtended(targetExpr(), scope, from, to, all, 200),
    getFieldDistributionExtended(bpartExpr, scope, from, to, all, 200),
    getFieldDistributionExtended(resultExpr(), scope, from, to, all, 200),
    getFieldDistributionExtended(step4TypeField, scope, from, to, all, 50),
    getTotalReportsCount(scope, from, to, all),

    // 11 шагов — исходники
    getFieldDistributionExtended('id_code', scope, from, to, all, 9999),        // Шаг 1
    getFieldDistributionExtended(CREATED_DAY_EXPR, scope, from, to, all, 9999), // Шаг 2 (дата по created_at)
    getFieldDistributionExtended('number_n', scope, from, to, all, 9999),       // Шаг 3
    getFieldDistributionExtended('coords', scope, from, to, all, 9999),         // Шаг 5
    getFieldDistributionExtended('freq', scope, from, to, all, 9999),           // Шаг 6
    getFieldDistributionExtended("COALESCE(dopv_main,'') || '::' || COALESCE(dopv_sub,'')", scope, from, to, all, 9999), // Шаг 8
    getFieldDistributionExtended("COALESCE(vv_main,'')   || '::' || COALESCE(vv_sub,'')",   scope, from, to, all, 9999), // Шаг 9
  ]);

  // ====== Круговые/столбчатые (как было) ======
  const step10Slices = (targetCombined as DistRow[]).map((r) => ({
    label: decodeTargetCombined(r.label),
    value: toNum(r),
  }));

  const resultSlices = (resultCombined as DistRow[]).map((r) => ({
    label: decodeResultCombined(r.label),
    value: toNum(r),
  }));

  const step4TypeSlices = (step4TypeData as DistRow[]).map((r) => ({
    label: r.label,
    value: toNum(r),
  }));

  // В-часть — агрегаты
  const byMain = aggregateBPart(bpartCombined as DistRow[]);

  // 4 линии + «Другое»
  const covered = new Set(BPART_GROUPS.flatMap((g) => g.mains.map(norm)));
  const lineRows = BPART_GROUPS.map((g) => {
    let u = 0, k = 0;
    g.mains.forEach((m) => {
      const mm = norm(m);
      const t = byMain[mm];
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

  const summaryBPartList: { label: string; value: number }[] = [];
  for (const name of MAIN_DISPLAY_ORDER) {
    const m = norm(name);
    const t = byMain[m];
    const value = t ? (KG_MAINS.has(m) ? t.kg : t.units) : 0;
    summaryBPartList.push({ label: m, value });
  }

  const bpartGroupSlices = lineRows.map((r) => ({ label: r.label, value: r.value }));

  const resetHref = isUsers ? '/stats?tab=users' : '/stats';
  const badge = isUsers
    ? 'ПО КОДУ ПОЛЬЗОВАТЕЛЯ · «ТОЧЕЧНАЯ АНАЛИТИКА»'
    : 'ТАКТИКУЛЬНАЯ СВОДКА · «ВИДИМ, ЗНАЕМ, ДЕЙСТВУЕМ»';

  /* ===================== 11 ШАГОВ — ДЕТАЛЬНЫЕ СЕКЦИИ ===================== */

  // Универсальный хелпер
  function sumByMain(rows: DistRow[], decodeLabel?: (main: string, sub?: string) => string) {
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
  }

  // Шаг 7 — точное суммирование
  const step7BPartItems = MAIN_DISPLAY_ORDER.map((m) => {
    const t = byMain[m] || { units: 0, kg: 0 };
    const value = KG_MAINS.has(m) ? t.kg : t.units;
    return { label: m, value };
  }).filter((x) => x.value > 0);

  // Доп. секции:
  const step1Items = (step1IdCode as DistRow[])
    .map((r) => ({ label: String(r.label || '—'), value: toNum(r) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));

  const step2Items = (step2Date as DistRow[])
    .map((r) => ({ label: String(r.label || '—'), value: toNum(r) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));

  const step3Items = (step3Number as DistRow[])
    .map((r) => ({ label: String(r.label || '—'), value: toNum(r) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));

  const step4Items = (step4TypeData as DistRow[])
    .map((r) => ({ label: String(r.label || '—'), value: toNum(r) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));

  const step5Items = (step5Coords as DistRow[])
    .map((r) => ({ label: String(r.label || '—'), value: toNum(r) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));

  const step6Items = (step6Freq as DistRow[])
    .map((r) => ({ label: String(r.label || '—'), value: toNum(r) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));

  const step8Items = sumByMain(dopvCombined as DistRow[]); // dopv_main::dopv_sub
  const step9Items = sumByMain(vvCombined as DistRow[]);   // vv_main::vv_sub
  const step10Items = sumByMain(targetCombined as DistRow[], (main, sub) =>
    decodeTargetCombined(`${main}${sub ? `::${sub}` : ''}`),
  );
  const step11Items = sumByMain(resultCombined as DistRow[], (main, sub) =>
    decodeResultCombined(`${main}${sub ? `::${sub}` : ''}`),
  );

  // Больше НИКАКИХ «служебных метрик»/«Молний» — секцию удалили.

  /* ===================== RENDER ===================== */

  // Ссылка «За весь период» (сохраняем tab/user, но очищаем даты)
  const params = new URLSearchParams();
  if (isUsers) params.set('tab', 'users');
  if (isUsers && user) params.set('user', user);
  params.set('all', '1');
  const allHref = `/stats?${params.toString()}`;

  return (
    <div className="w-full">
      <div className="mx-auto max-w-6xl px-3">
        {/* Шапка — компактная */}
        <div className="sticky top-0 z-10 -mx-3 px-3 pt-2 pb-2 backdrop-blur">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-12 md:col-span-6 flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">Ops Dashboard</h1>
                <div className="rounded-full px-2.5 py-1 text-[10px] tracking-wide uppercase bg-white/5 text-white/70">
                  {badge}
                </div>
              </div>
              <div className="col-span-12 md:col-span-6 md:justify-self-end flex items-center gap-2">
                <Tabs />
                {/* МАЛЕНЬКАЯ КНОПКА ЭКСПОРТА */}
                <a
                  href={(isUsers ? '/stats?tab=users&export=1' : '/stats?export=1')
                        + (from ? `&from=${from}` : '') + (to ? `&to=${to}` : '')}
                  className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
                >
                  Экспорт
                </a>
                {/* Кнопка «За весь период» */}
                {!all && (
                  <a
                    href={allHref}
                    className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
                    title="Показать все параметры за весь период"
                  >
                    За весь период
                  </a>
                )}
              </div>
            </div>

            <div className="mt-2">
              <PeriodFilterBar
                initialFrom={from || ''}
                initialTo={to || ''}
                initialAll={!!all}
                resetHref={isUsers ? '/stats?tab=users' : '/stats'}
              />
            </div>

            {isUsers && (
              <div className="mt-2">
                <CodeFilterBar initialUser={sp.user as string} />
              </div>
            )}
          </div>
        </div>

        {/* Контент */}
        <div className="space-y-4 mt-3">
          {/* Карточка «текущая дата / всего отчётов / по кодам доступа» + сводка по В-части */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatsSummary
              totalReports={Number(totalReports) || 0}
              userCounts={users}
              step7Data={summaryBPartList}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DonutLite data={step10Slices} title="Шаг 10" showTopN={3} groupOthers />
            <DonutLite data={bpartGroupSlices} title="В-часть · линии (суммы)" showTopN={5} groupOthers />
            <DonutLite data={resultSlices} title="Результат" showTopN={3} groupOthers />
            <HorizontalBar data={step4TypeSlices} title="Шаг 4 · тип" showTopN={6} />
          </div>

          {/* ДЕТАЛЬНЫЙ ОТЧЁТ ПО 11 ШАГАМ (без «служебных метрик») */}
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

          <div className="mt-3 text-xs text-white/40">
            {isUsers ? (
              <>Всего отчётов по коду {String(sp.user || '—')} за выбранный период: <span className="font-semibold">{Number(totalReports) || 0}</span></>
            ) : (
              <>Всего отчётов за выбранный период: <span className="font-semibold">{Number(totalReports) || 0}</span></>
            )}
          </div>
        </div>
      </div>

      {/* Модалка экспорта монтируется клиентом при ?export=1 */}
      <ExportModalIsland />
    </div>
  );
}
