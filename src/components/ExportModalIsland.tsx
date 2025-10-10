'use client';

import { useEffect, useState, useCallback } from 'react';
import ExportModal from './ExportModal';

export default function ExportModalIsland() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const readRangeFromURL = useCallback(() => {
    const q = new URLSearchParams(window.location.search);
    const f = q.get('from') || undefined;
    const t = q.get('to') || undefined;
    setFrom(f);
    setTo(t);
  }, []);

  const openModal = useCallback(() => {
    readRangeFromURL();
    setOpen(true);
  }, [readRangeFromURL]);

  const closeModal = useCallback(() => {
    setOpen(false);
    // если был ?export=1 — уберём его аккуратно (остальные параметры не трогаем)
    const q = new URLSearchParams(window.location.search);
    if (q.get('export') === '1') {
      q.delete('export');
      const next = `${window.location.pathname}${q.toString() ? `?${q.toString()}` : ''}`;
      window.history.replaceState(null, '', next);
    }
  }, []);

  useEffect(() => {
    // 1) автозапуск по ?export=1
    const q = new URLSearchParams(window.location.search);
    if (q.get('export') === '1') openModal();

    // 2) слушаем кнопку из Tabs
    const onOpen = () => openModal();
    window.addEventListener('open-export-modal' as any, onOpen);

    // 3) закрытие по Esc
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('open-export-modal' as any, onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, [openModal, closeModal]);

  if (!open) return null;
  return (
    <ExportModal
      open={open}
      onClose={closeModal}
      initialFrom={from}
      initialTo={to}
    />
  );
}
