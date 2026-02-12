// src/components/ExportModal.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  initialFrom?: string;
  initialTo?: string;
};

export default function ExportModal({ open, onClose, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState<string>(initialFrom || '');
  const [to, setTo] = useState<string>(initialTo || '');
  const [all, setAll] = useState<boolean>(!(initialFrom || initialTo));

  const [scope, setScope] = useState<'all' | 'user'>('all');
  const [userCode, setUserCode] = useState<string>('');

  // чекбоксы секций
  const [sections, setSections] = useState<Record<string, boolean>>({
    step1: true, step2: true, step3: true, step4: true, step5: true, step6: true,
    step7: true, step8: true, step9: true, step10: true, step11: true, totals: true,
  });

  const dialogRef = useRef<HTMLDivElement | null>(null);

  // блокируем скролл боди, закрытие по ESC и по клику на фон
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      if (dialogRef.current && e.target instanceof Node && dialogRef.current === e.target) onClose();
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.addEventListener('click', onClick);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      dialogRef.current?.removeEventListener('click', onClick as any);
    };
  }, [open, onClose]);

  useEffect(() => { if (initialFrom) setFrom(initialFrom); if (initialTo) setTo(initialTo); }, [initialFrom, initialTo]);

  const qsFromPage = useMemo(() => {
    const qs = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    qs.forEach((v, k) => (result[k] = v));
    return result;
  }, []);

  const buildQuery = () => {
    const qs = new URLSearchParams();
    if (all) qs.set('all', '1');
    if (!all && from) qs.set('from', from);
    if (!all && to) qs.set('to', to);

    if (scope === 'user' && userCode) qs.set('user', userCode);

    Object.entries(qsFromPage).forEach(([k, v]) => {
      if (!['all', 'from', 'to', 'user'].includes(k)) qs.set(k, v);
    });

    const enabled = Object.entries(sections).filter(([, v]) => v).map(([k]) => k);
    qs.set('sections', enabled.join(','));

    // формат можно поменять на csv/xlsx на бэкенде
    qs.set('format', 'xlsx');
    return qs;
  };

  const startDownload = async () => {
    const url = `/api/export?${buildQuery().toString()}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `export_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      onClose();
    } catch (e) {
      alert('Не удалось выполнить экспорт. Проверьте доступность эндпоинта /api/export.');
    }
  };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3"
      aria-modal="true"
      role="dialog"
    >
      <div
        className={[
          'w-full max-w-[720px] rounded-2xl border border-white/10 bg-[#0b1411] shadow-2xl',
          'max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-base font-semibold text-neutral-200">Экспорт отчёта</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md grid place-items-center border border-white/10 hover:bg-white/[0.06] text-white/80"
            aria-label="Закрыть"
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Body (scroll) */}
        <div className="px-4 py-4 overflow-y-auto space-y-6">
          {/* Диапазон дат */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-neutral-400">Диапазон</div>
            <label className="block">
              <span className="block text-[12px] text-neutral-500 mb-1">Дата от (created_at):</span>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setAll(false); }}
                className="h-11 w-full rounded-lg px-3 bg-white/5 border border-white/12 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
              />
            </label>
            <label className="block">
              <span className="block text-[12px] text-neutral-500 mb-1">Дата до (включительно):</span>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setAll(false); }}
                className="h-11 w-full rounded-lg px-3 bg-white/5 border border-white/12 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={all}
                onChange={(e) => setAll(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-neutral-300 select-none">За весь период</span>
            </label>
          </section>

          {/* Охват пользователей */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-neutral-400">Охват пользователей</div>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
              <span className="text-sm text-neutral-300">По всем пользователям</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === 'user'} onChange={() => setScope('user')} />
              <span className="text-sm text-neutral-300">По коду доступа (id_code):</span>
            </label>
            <input
              disabled={scope !== 'user'}
              placeholder="например: 260600"
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              className={[
                'h-11 w-full rounded-lg px-3',
                'bg-white/5 border border-white/12 outline-none',
                'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition',
                scope !== 'user' ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            />
          </section>

          {/* Какие разделы выгружать */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-neutral-400">Какие разделы выгружать</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                ['step1','Шаг 1 · Код доступа (id_code)'],
                ['step2','Шаг 2 · Дата (по created_at, день)'],
                ['step3','Шаг 3 · Номер (number_n)'],
                ['step4','Шаг 4 · Тип (type_choice)'],
                ['step5','Шаг 5 · Координаты'],
                ['step6','Шаг 6 · Частота (freq)'],
                ['step7','Шаг 7 · В-часть (суммирование подкатегорий)'],
                ['step8','Шаг 8 · Доп.в (main+sub → main)'],
                ['step9','Шаг 9 · ВВ (main+sub → main)'],
                ['step10','Шаг 10 · Target (main/sub → main)'],
                ['step11','Шаг 11 · Result (main/sub → main)'],
                ['totals','Итоги · служебные метрики'],
              ] as [keyof typeof sections, string][]).map(([key, title]) => (
                <label key={key} className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06]">
                  <input
                    type="checkbox"
                    checked={!!sections[key]}
                    onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.checked }))}
                  />
                  <span className="text-sm text-neutral-200">{title}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex flex-col sm:flex-row gap-2">
          <button
            onClick={startDownload}
            className="h-11 w-full sm:w-auto px-4 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/15 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
          >
            ⭳ Скачать
          </button>
          <button
            onClick={onClose}
            className="h-11 w-full sm:w-auto px-4 rounded-lg border border-white/12 bg-white/[0.02] hover:bg-white/[0.07] text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/25"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
