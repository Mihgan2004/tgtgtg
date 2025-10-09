// src/components/PeriodFilterBar.tsx
'use client';

type Props = {
  initialFrom?: string;
  initialTo?: string;
  initialAll?: boolean;
  resetHref: string;
};

export default function PeriodFilterBar({
  initialFrom = '',
  initialTo = '',
  initialAll = false,
  resetHref,
}: Props) {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const from = String(fd.get('from') || '').trim();
    const to = String(fd.get('to') || '').trim();
    const all = fd.get('all') ? '1' : '';

    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const user = params.get('user');

    ['from', 'to', 'all'].forEach((k) => params.delete(k));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (all) params.set('all', '1');
    if (tab) params.set('tab', tab);
    if (user) params.set('user', user);

    window.location.search = params.toString();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 p-3 bg-transparent flex flex-col gap-3 md:flex-row md:items-end"
    >
      <div className="flex flex-col">
        <label className="text-xs text-white/60 mb-1">Начало периода</label>
        <input
          name="from"
          placeholder="ДД.ММ.ГГГГ"
          defaultValue={initialFrom}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-white/60 mb-1">Конец периода</label>
        <input
          name="to"
          placeholder="ДД.ММ.ГГГГ"
          defaultValue={initialTo}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
        />
      </div>
      <label className="inline-flex items-center gap-2 ml-1">
        <input type="checkbox" name="all" defaultChecked={initialAll} />
        <span className="text-sm text-white/80">за всё время</span>
      </label>
      <div className="ml-auto flex gap-2">
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 font-medium">
          ✓ Применить
        </button>
        <a href={resetHref} className="bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2">
          ↺ Сбросить
        </a>
      </div>
    </form>
  );
}
