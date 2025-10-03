'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function Tabs() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const active = sp.get('tab') || 'summary';

  function go(tab: string) {
    const p = new URLSearchParams(sp.toString());
    p.set('tab', tab);
    router.push(`${path}?${p.toString()}`);
  }

  const base = "px-4 py-2 rounded-lg border border-white/10 bg-camo-800/60 hover:bg-camo-700/60 transition";
  const on  = "text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]";
  const off = "text-neutral-300";

  return (
    <div className="flex items-center gap-2">
      <button onClick={()=>go('summary')} className={`${base} ${active==='summary'?on:off}`}>Общий отчёт</button>
      <button onClick={()=>go('users')}   className={`${base} ${active==='users'?on:off}`}>По пользователям</button>
    </div>
  );
}
