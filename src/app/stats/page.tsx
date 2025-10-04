// src/app/stats/page.tsx
import Tabs from '@/components/Tabs';
import TotalsList from '@/components/TotalsList';
import UsersPicker from '@/components/UsersPicker';
import Donut, { type Slice } from '@/components/Donut';
import {
  INDICATOR_LABEL, type Indicator,
  getFieldDistribution, getTotalsCommon,
  getAllowedCodesWithCounts,
} from '@/lib/queries';

export const revalidate = 0;

const MAIN_5: Indicator[] = ['b_part_main','dopv_main','vv_main','target_main','result_main'];

const LABELS: Record<string,string> = {
  id_code:'Код доступа', date_time:'Дата/время', number_n:'Номер', type_choice:'Тип', coords:'Координаты', freq:'Частота',
  b_part_main:'B-часть (основная)', b_part_sub1:'B-часть · подкатегория 1', b_part_sub2:'B-часть · подкатегория 2',
  dopv_main:'Доп.в (основная)', dopv_sub:'Доп.в · подкатегория',
  vv_main:'ВВ (основная)', vv_sub:'ВВ · подкатегория',
  target_main:'Цель (основная)', target_sub:'Цель · подкатегория',
  result_main:'Результат (основной)', result_sub:'Результат · подкатегория',
};

const ALL_FIELDS = [
  'id_code','date_time','number_n','type_choice','coords','freq',
  'b_part_main','b_part_sub1','b_part_sub2',
  'dopv_main','dopv_sub',
  'vv_main','vv_sub',
  'target_main','target_sub',
  'result_main','result_sub',
] as const;

export default async function StatsPage({
  searchParams
}:{ searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const get = (k:string)=> (typeof sp[k]==='string'? sp[k] as string : undefined);

  const tab  = get('tab') ?? 'summary';
  const all  = get('all') === '1';
  const from = (get('from')?.trim() || null);
  const to   = (get('to')?.trim()   || null);

  // Общие донаты
  const dists = await Promise.all(MAIN_5.map(f => getFieldDistribution(f, {}, from, to, all, 6)));
  const donuts: Slice[][] = dists.map(rows => {
    const topSum = rows.reduce((s,r)=>s+r.count, 0);
    const total  = rows[0]?.total ?? topSum;
    const other  = Math.max(0, total - topSum);
    const data   = rows.map(r => ({ label: String(r.label), value: r.count }));
    if (other > 0) data.push({ label:'Прочие', value: other });
    return data;
  });

  const totals = await getTotalsCommon({}, from, to, all);
  const totalsItems = ALL_FIELDS.map(k => ({
    label: LABELS[k] ?? k,
    value: Number(totals[k] ?? 0),
  }));

  // Список кодов доступа
  const codes = await getAllowedCodesWithCounts(from, to, all);
  const codeOptions = codes.map(c => ({ id: c.id_code, label: c.id_code }));

  const uidParam = (get('uid') ?? '').trim();
  const uid = (uidParam && codeOptions.some(o => o.id === uidParam))
    ? uidParam
    : (codeOptions[0]?.id ?? null);

  let userDonuts: Slice[][] | null = null;
  let userTotals: Record<string, number> | null = null;

  if (uid) {
    const d2 = await Promise.all(
      MAIN_5.map(f => getFieldDistribution(f, { idCode: uid }, from, to, all, 6))
    );
    userDonuts = d2.map(rows=>{
      const topSum = rows.reduce((s,r)=>s+r.count,0);
      const total  = rows[0]?.total ?? topSum;
      const other  = Math.max(0, total - topSum);
      const arr: Slice[] = rows.map(r=>({ label:String(r.label), value:r.count }));
      if (other>0) arr.push({ label:'Прочие', value:other });
      return arr;
    });
    userTotals = await getTotalsCommon({ idCode: uid }, from, to, all);
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="slide-in">
          <h1 className="h1">Ops Dashboard</h1>
          <p className="muted mt-1">Суммарный расход по показателям</p>
        </div>
        <div className="slide-in" style={{animationDelay: '0.1s'}}>
          <Tabs />
        </div>
      </div>

      {/* Период */}
      <form className="card">
        <div className="flex flex-col gap-3">
          <div className="text-xs sm:text-sm uppercase tracking-widest text-neutral-400 font-semibold">
            Период
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
            <input type="date" name="from" defaultValue={from ?? undefined} className="flex-1 min-w-0"/>
            <span className="hidden sm:inline text-neutral-500">—</span>
            <input type="date" name="to" defaultValue={to ?? undefined} className="flex-1 min-w-0"/>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <label className="inline-flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
              <input type="checkbox" name="all" value="1" defaultChecked={all} />
              <span>за всё время</span>
            </label>
            <button type="submit" className="sm:ml-auto px-4 py-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 active:bg-emerald-600 text-white font-medium transition-all">
              Применить
            </button>
          </div>
        </div>
      </form>

      {tab === 'summary' && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {MAIN_5.map((field, i) => (
              <div key={field} className="card h-[280px] sm:h-[300px] p-3 sm:p-4 flex flex-col donut-pop" style={{animationDelay: `${i * 0.1}s`}}>
                <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2 truncate">
                  {INDICATOR_LABEL[field]}
                </div>
                <div className="flex-1 grid place-items-center min-h-0">
                  <Donut data={donuts[i]} />
                </div>
              </div>
            ))}
          </section>

          <div className="legend-fade">
            <TotalsList items={totalsItems} />
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          {/* Фактически выбор КОДА ДОСТУПА */}
          <div className="slide-in">
            <UsersPicker options={codeOptions} />
          </div>

          {uid && userDonuts && userTotals ? (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {MAIN_5.map((field, i) => (
                  <div key={field} className="card h-[280px] sm:h-[300px] p-3 sm:p-4 flex flex-col donut-pop" style={{animationDelay: `${i * 0.1}s`}}>
                    <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2 truncate">
                      {INDICATOR_LABEL[field]}
                    </div>
                    <div className="flex-1 grid place-items-center min-h-0">
                      <Donut data={userDonuts[i]} />
                    </div>
                  </div>
                ))}
              </section>

              <div className="legend-fade">
                <TotalsList
                  items={ALL_FIELDS.map(k => ({
                    label: LABELS[k] ?? k,
                    value: Number(userTotals[k] ?? 0),
                  }))}
                />
              </div>
            </>
          ) : (
            <div className="card text-center py-8 text-neutral-400">
              Нет данных по выбранному коду доступа
            </div>
          )}
        </>
      )}
    </div>
  );
}
