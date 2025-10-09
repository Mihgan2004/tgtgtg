'use client';

type Option = { id: string; label: string };

export default function UsersFilterBar({
  options,
  initialUser,
}: {
  options: Option[];
  initialUser?: string;
}) {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const user = String(fd.get('user') || '').trim();

    const params = new URLSearchParams(window.location.search);
    // мы на вкладке users, гарантируем tab=users
    params.set('tab', 'users');
    params.delete('user');
    if (user) params.set('user', user);

    // НЕ трогаем from/to/all — они могут быть от Периода
    const qs = params.toString();
    window.location.search = qs;
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-end gap-3">
      <div className="flex-1">
        <label className="text-xs text-white/60 mb-1 block">Пользователь</label>
        <select
          name="user"
          defaultValue={initialUser || ''}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full"
        >
          <option value="">— все —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 font-medium">
        ✓ Применить
      </button>
      <a href="/stats?tab=users" className="bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2">
        ↺ Сбросить
      </a>
    </form>
  );
}
