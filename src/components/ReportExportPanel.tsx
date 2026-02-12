// src/components/ReportExportPanel.tsx
'use client';

import { useState } from 'react';

type Multi = string[];

export default function ReportExportPanel() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [typeChoice, setTypeChoice] = useState<Multi>([]);
  const [resultMain, setResultMain] = useState<Multi>([]);
  const [targetMain, setTargetMain] = useState<Multi>([]);
  const [idCodes, setIdCodes] = useState<string>('');

  function parseList(s: string): string[] {
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }

  async function download(format: 'pdf'|'docx') {
    const body = {
      from: from || undefined,
      to: to || undefined,
      format,
      filters: {
        type_choice: typeChoice.length ? typeChoice : undefined,
        result_main: resultMain.length ? resultMain : undefined,
        target_main: targetMain.length ? targetMain : undefined,
        id_code: parseList(idCodes).length ? parseList(idCodes) : undefined,
      },
    };

    const res = await fetch('/api/reports/export', {
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
    a.download = `reports_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const inputCls = 'w-full rounded-md bg-white/5 border border-white/10 px-2 py-1 text-sm';

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="text-sm font-semibold">Экспорт отчёта</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div>
          <div className="text-xs text-white/60 mb-1">Дата от (created_at)</div>
          <input type="date" className={inputCls} value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Дата до (включительно)</div>
          <input type="date" className={inputCls} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Тип (type_choice)</div>
          <input
            className={inputCls}
            placeholder="через запятую, например: Молния, Стандарт"
            onChange={e => setTypeChoice(parseList(e.target.value))}
          />
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">ID-коды (id_code)</div>
          <input
            className={inputCls}
            placeholder="например: 260600, U001"
            value={idCodes}
            onChange={e => setIdCodes(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Result main (цифры)</div>
          <input className={inputCls} placeholder="напр.: 1,2,4" onChange={e => setResultMain(parseList(e.target.value))} />
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Target main (цифры)</div>
          <input className={inputCls} placeholder="напр.: 5,6,7" onChange={e => setTargetMain(parseList(e.target.value))} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={() => download('docx')} className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15">
          Скачать DOCX
        </button>
        <button onClick={() => download('pdf')} className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15">
          Скачать PDF
        </button>
      </div>
    </div>
  );
}
