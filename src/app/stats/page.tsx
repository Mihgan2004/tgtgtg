import Tabs from '@/components/Tabs';
import TotalsList from '@/components/TotalsList';
import UsersPicker from '@/components/UsersPicker';
import Donut, { type Slice } from '@/components/Donut';
import {
  INDICATOR_LABEL, type Indicator,
  getFieldDistribution, getTotalsCommon,
  getAllowedUsersWithCounts, ALLOWED_USER_IDS,
} from '@/lib/queries';

export const revalidate = 0;

const MAIN_5: Indicator[] = ['b_part_main','dopv_main','vv_main','target_main','result_main'];

// Полный порядок сводки (всего 17)
const ALL_FIELDS: (keyof ReturnType<any> | string)[] = [
  'id_code','date_time','number_n','type_choice','coords','freq',
  'b_part_main','b_part_sub1','b_part_sub2',
  'dopv_main','dopv_sub',
  'vv_main','vv_sub',
  'target_main','target_sub',
  'result_main','result_sub',
];

export default async function StatsPage({
  searchParams
}:{ searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const get = (k:string)=> (typeof sp[k]==='string'? sp[k] as string : undefined);

  const tab  = get('tab') ?? 'summary';
  const all  = get('all') === '1';
  const from = (get('from')?.trim() || null);
  const to   = (get('to')?.trim()   || null);

  // Глобальные распределения для 5 диаграмм
  const dists = await Promise.all(MAIN_5.map(f => getFieldDistribution(f, {}, from, to, all, 6)));
  const donuts: Slice[][] = dists.map(rows => {
    const topSum = rows.reduce((s,r)=>s+r.count, 0);
    const total  = rows[0]?.total ?? topSum;
    const other  = Math.max(0, total - topSum);
    const data   = rows.map(r => ({ label: String(r.label), value: r.count }));
    if (other > 0) data.push({ label:'Прочие', value: other });
    return data;
  });

  // Сводка по всем показателям (жёсткий порядок + дефолт 0)
  const totalsRaw = await getTotalsCommon({}, from, to, all);
  const labelCommon: Record<string,string> = {
    id_code:'Код доступа', date_time:'Дата/время', number_n:'Номер', type_choice:'Тип', coords:'Координаты', freq:'Частота',
    b_part_main:'B-часть (основная)', b_part_sub1:'B-часть · подкатегория 1', b_part_sub2:'B-часть · подкатегория 2',
    dopv_main:'Доп.в (основная)', dopv_sub:'Доп.в · подкатегория',
    vv_main:'ВВ (основная)', vv_sub:'ВВ · подкатегория',
    target_main:'Цель (основная)', target_sub:'Цель · подкатегория',
    result_main:'Результат (основной)', result_sub:'Результат · подкатегория',
  };
  const totalsItems = ALL_FIELDS.map(k => ({
    label: labelCommon[k as string] ?? (k as string),
    value: Number(totalsRaw[k as string] ?? 0),
  }));

  // USERS: строго 10 разрешённых
  const allowed = await getAllowedUsersWithCounts(from, to, all);
  const userOptions = allowed.map(u => ({ id: u.user_id, label: u.username ? `@${u.username}` : u.user_id }));

  // uid из query (допускаем ввод чистого id), валидируем по whitelist
  const uidParam = (get('uid') ?? '').trim();
  const uid = (uidParam && (ALLOWED_USER_IDS as readonly string[]).includes(uidParam))
    ? uidParam
    : (userOptions[0]?.id ?? null);

  let userDonuts: Slice[][] | null = null;
  let userTotals: Record<string, number> | null = null;
  if (uid) {
    const d2 = await Promise.all(MAIN_5.map(f => getFieldDistribution(f, { userId: uid }, from, to, all, 6)));
    userDonuts = d2.map(rows=>{
      const topSum = rows.reduce((s,r)=>s+r.count,0);
      const total  = rows[0]?.total ?? topSum;
      const other  = Math.max(0, total - topSum);
      const arr: Slice[] = rows.map(r=>({ label:String(r.label), value:r.count }));
      if (other>0) arr.push({ label:'Прочие', value:other });
      return arr;
    });
    userTotals = await getTotalsCommon({ userId: uid }, from, to, all);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1">Ops Dashboard</h1>
          <p className="muted mt-1">Суммарный расход по показателям (распределения).</p>
        </div>
        <Tabs />
      </div>

      {/* Период */}
      <form className="card flex gap-3 items-center">
        <div className="text-sm uppercase tracking-widest text-neutral-400">Период</div>
        <input type="date" name="from" defaultValue={from ?? undefined} className="px-3 py-2 rounded-lg bg-camo-700/70 border border-white/10"/>
        <span className="text-neutral-500">—</span>
        <input type="date" name="to" defaultValue={to ?? undefined} className="px-3 py-2 rounded-lg bg-camo-700/70 border border-white/10"/>
        <label className="ml-2 inline-flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="all" value="1" defaultChecked={all} />
          за всё время
        </label>
        <button className="ml-auto px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white">Применить</button>
      </form>

      {tab === 'summary' && (
        <>
          {/* 5 круговых диаграмм */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[1fr]">
            {MAIN_5.map((field, i) => (
              <div key={field} className="card h-[300px] p-4 flex flex-col">
                <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">{INDICATOR_LABEL[field]}</div>
                <div className="flex-1 grid place-items-center">
                  <Donut data={donuts[i]} caption="распределение по категориям" />
                </div>
              </div>
            ))}
          </section>

          <TotalsList items={totalsItems} />
        </>
      )}

      {tab === 'users' && (
        <>
          <UsersPicker options={userOptions} />
          {uid && userDonuts && userTotals ? (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[1fr]">
                {MAIN_5.map((field, i) => (
                  <div key={field} className="card h-[300px] p-4 flex flex-col">
                    <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">{INDICATOR_LABEL[field]}</div>
                    <div className="flex-1 grid place-items-center">
                      <Donut data={userDonuts[i]} caption="распределение по категориям" />
                    </div>
                  </div>
                ))}
              </section>
              <TotalsList
                items={ALL_FIELDS.map(k => ({
                  label: labelCommon[k as string] ?? (k as string),
                  value: Number(userTotals[k as string] ?? 0),
                }))}
              />
            </>
          ) : (
            <div className="card">Нет данных по выбранному пользователю.</div>
          )}
        </>
      )}
    </div>
  );
}
