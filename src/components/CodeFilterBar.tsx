'use client';

export default function CodeFilterBar({ initialUser }: { initialUser?: string }) {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const user = String(fd.get('user') || '').trim();

    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'users');
    params.delete('user');
    if (user) params.set('user', user);
    window.location.search = params.toString();
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 p-3 bg-transparent">
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-12 sm:col-span-8">
          <label className="text-xs text-white/60 mb-1 block">Код пользователя</label>
          <input
            name="user"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="например, 260600"
            defaultValue={initialUser || ''}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
          />
        </div>
        <div className="col-span-12 sm:col-span-4 flex justify-end gap-2">
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 font-medium">
            ✓ Применить
          </button>
          <a href="/stats?tab=users" className="bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2">↺ Сбросить</a>
        </div>
      </div>
    </form>
  );
}
