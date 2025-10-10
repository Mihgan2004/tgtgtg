'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  initialFrom?: string;
  initialTo?: string;
};

const inputCls =
  'w-full rounded-md bg-white/5 border border-white/10 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-white/20';

const stepsAll = [
  { key: '1', title: 'Шаг 1 · Код доступа (id_code)' },
  { key: '2', title: 'Шаг 2 · Дата (по created_at, день)' },
  { key: '3', title: 'Шаг 3 · Номер (number_n)' },
  { key: '4', title: 'Шаг 4 · Тип (type_choice)' },
  { key: '5', title: 'Шаг 5 · Координаты' },
  { key: '6', title: 'Шаг 6 · Частота (freq)' },
  { key: '7', title: 'Шаг 7 · B-часть (суммирование подкатегорий)' },
  { key: '8', title: 'Шаг 8 · Доп.в (main+sub → main)' },
  { key: '9', title: 'Шаг 9 · ВВ (main+sub → main)' },
  { key: '10', title: 'Шаг 10 · Target (main/sub → main)' },
  { key: '11', title: 'Шаг 11 · Result (main/sub → main)' },
  { key: 'T', title: 'Итоги · служебные метрики' },
];

export default function ExportModal({ open, onClose, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom ?? '');
  const [to, setTo] = useState(initialTo ?? '');
  const [all, setAll] = useState(false);

  const [modeAllUsers, setModeAllUsers] = useState(true);
  const [idCode, setIdCode] = useState('');

  const [selected, setSelected] = useState<string[]>(stepsAll.map((s) => s.key));
  const [busy, setBusy] = useState<'docx' | 'pdf' | null>(null);

  useEffect(() => {
    if (open) {
      setFrom(initialFrom ?? '');
      setTo(initialTo ?? '');
      setAll(false);
      setModeAllUsers(true);
      setIdCode('');
      setSelected(stepsAll.map((s) => s.key));
      setBusy(null);
        if (!open) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };

    }
  }, [open, initialFrom, initialTo]);

  const canExport = useMemo(() => {
    if (!modeAllUsers && idCode.trim() === '') return false;
    if (!all && from.trim() === '' && to.trim() === '') return false;
    return true;
  }, [modeAllUsers, idCode, all, from, to]);

  async function doExport(format: 'docx' | 'pdf') {
    if (busy) return;
    setBusy(format);
    try {
      const body: any = {
        from: all ? undefined : from || undefined,
        to: all ? undefined : to || undefined,
        all: all ? 1 : 0,
        forAllUsers: modeAllUsers ? 1 : 0,
        code: modeAllUsers ? undefined : idCode.trim(),
        includeSteps: selected, // массив '1'..'11','T'
        format,
      };
      const res = await fetch('/api/reports/export-detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        alert('Ошибка экспорта: ' + t);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[720px] max-w-[95vw] rounded-2xl border border-white/10 bg-[#0d1615] p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Экспорт «Детальная сводка»</div>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-white/60 mb-1">Дата от (created_at)</div>
            <input type="date" className={inputCls} value={from} onChange={e => setFrom(e.target.value)} disabled={all} />
          </div>
          <div>
            <div className="text-xs text-white/60 mb-1">Дата до (включительно)</div>
            <input type="date" className={inputCls} value={to} onChange={e => setTo(e.target.value)} disabled={all} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} />
              <span>За весь период</span>
            </label>
          </div>

          <div className="md:col-span-2 rounded-lg border border-white/10 p-3">
            <div className="text-xs text-white/60 mb-2">Охват пользователей</div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="flex items-center gap-2 text-sm mr-4">
                <input
                  type="radio"
                  checked={modeAllUsers}
                  onChange={() => setModeAllUsers(true)}
                />
                <span>По всем пользователям</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={!modeAllUsers}
                  onChange={() => setModeAllUsers(false)}
                />
                <span>По коду доступа (id_code):</span>
              </label>
              <input
                className={inputCls + ' md:ml-2 md:flex-1'}
                placeholder="например: 260600"
                disabled={modeAllUsers}
                value={idCode}
                onChange={e => setIdCode(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2 rounded-lg border border-white/10 p-3">
            <div className="text-xs text-white/60 mb-2">Какие разделы выгружать</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
              {stepsAll.map(s => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(s.key)}
                    onChange={e => {
                      setSelected(prev => {
                        if (e.target.checked) return [...new Set([...prev, s.key])];
                        return prev.filter(x => x !== s.key);
                      });
                    }}
                  />
                  <span>{s.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            disabled={!canExport || !!busy}
            onClick={() => doExport('docx')}
            className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            {busy === 'docx' ? 'Готовим…' : 'Скачать DOCX'}
          </button>
          <button
            disabled={!canExport || !!busy}
            onClick={() => doExport('pdf')}
            className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            {busy === 'pdf' ? 'Готовим…' : 'Скачать PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}