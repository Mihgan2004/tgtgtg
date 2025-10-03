'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ALLOWED_USER_IDS } from '@/lib/constants';

export default function UsersPicker({
  options
}: { options: { id: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function go(id: string) {
    if (!(ALLOWED_USER_IDS as readonly string[]).includes(id)) return;
    const params = new URLSearchParams(sp.toString());
    params.set('tab', 'users');
    params.set('uid', id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="card p-4 flex items-center gap-3">
      <input
        list="users"
        className="px-3 py-2 rounded-lg bg-camo-700/70 border border-white/10 w-72"
        placeholder="Введите @username или ID (например 260600)"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = (e.currentTarget.value || '').trim();
            const direct = options.find(o => o.id === v);
            const byLabel = options.find(o =>
              o.label.toLowerCase().includes(v.toLowerCase()) || o.id.includes(v)
            );
            const pick = direct ?? byLabel;
            if (pick) go(pick.id);
          }
        }}
      />
      <datalist id="users">
        {options.map(o => (
          <option key={o.id} value={`${o.label} (${o.id})`} />
        ))}
      </datalist>

      <select
        className="px-3 py-2 rounded-lg bg-camo-700/70 border border-white/10"
        defaultValue=""
        onChange={(e) => { const v = e.target.value; if (v) go(v); }}
      >
        <option value="" disabled>Выберите пользователя</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label} ({o.id})</option>
        ))}
      </select>
    </div>
  );
}
