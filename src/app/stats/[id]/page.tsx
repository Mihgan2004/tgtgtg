import Donut, { type Slice } from '@/components/Donut';
import TotalsList from '@/components/TotalsList';
import {
  INDICATOR_LABEL, type Indicator,
  getFieldDistribution, getTotalsCommon, ALLOWED_USER_IDS,
} from '@/lib/queries';

export const revalidate = 0;

const MAIN_5: Indicator[] = ['b_part_main','dopv_main','vv_main','target_main','result_main'];

export default async function StatsById({
  params, searchParams
}:{ params:{id:string}, searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const get = (k:string)=> (typeof sp[k]==='string'? sp[k] as string : undefined);

  const id   = params.id;
  const all  = get('all') === '1';
  const from = (get('from')?.trim() || null);
  const to   = (get('to')?.trim()   || null);

  if (!(ALLOWED_USER_IDS as readonly string[]).includes(id)) {
    return <div className="card">Этот пользователь не входит в список разрешённых.</div>;
  }

  const dists = await Promise.all(MAIN_5.map(f => getFieldDistribution(f, { userId:id }, from, to, all, 6)));
  const donuts: Slice[][] = dists.map(rows=>{
    const top = rows.reduce((s,r)=>s+r.count,0);
    const total = rows[0]?.total ?? top;
    const other = Math.max(0, total-top);
    const arr: Slice[] = rows.map(r=>({ label:String(r.label), value:r.count }));
    if (other>0) arr.push({ label:'Прочие', value:other });
    return arr;
  });

  const totals = await getTotalsCommon({ userId:id }, from, to, all);
  const labelCommon: Record<string,string> = {
    id_code:'Код доступа', date_time:'Дата/время', number_n:'Номер', type_choice:'Тип', coords:'Координаты', freq:'Частота',
    b_part_main:'B-часть (основная)', b_part_sub1:'B-часть · подкатегория 1', b_part_sub2:'B-часть · подкатегория 2',
    dopv_main:'Доп.в (основная)', dopv_sub:'Доп.в · подкатегория',
    vv_main:'ВВ (основная)', vv_sub:'ВВ · подкатегория',
    target_main:'Цель (основная)', target_sub:'Цель · подкатегория',
    result_main:'Результат (основной)', result_sub:'Результат · подкатегория',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="h1">Пользователь {id}</h1>
        <a href="/stats?tab=users" className="text-sm text-neutral-400 hover:text-white">← к списку</a>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[1fr]">
        {MAIN_5.map((f,i)=>(
          <div key={f} className="card h-[300px] p-4 flex flex-col">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">{INDICATOR_LABEL[f]}</div>
            <div className="flex-1 grid place-items-center">
              <Donut data={donuts[i]} caption="распределение по категориям" />
            </div>
          </div>
        ))}
      </section>

      <TotalsList items={Object.entries(totals).map(([k,v])=>({label:labelCommon[k] ?? k, value:Math.trunc(v)}))} />
    </div>
  );
}
