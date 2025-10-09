'use client';

import { useEffect, useMemo, useState } from 'react';
import ExportModal from './ExportModal';

export default function ExportModalIsland() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('export') === '1') {
      setOpen(true);
      const f = q.get('from') || undefined;
      const t = q.get('to') || undefined;
      setFrom(f);
      setTo(t);
    }
  }, []);

  if (!open) return null;
  return <ExportModal open={open} onClose={() => setOpen(false)} initialFrom={from} initialTo={to} />;
}
