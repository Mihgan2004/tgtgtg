export default function KpiPatch(
  { label, value, loading }:
  { label: string; value?: number; loading?: boolean }
) {
  const text = loading ? '…' : (typeof value === 'number' ? new Intl.NumberFormat('ru-RU').format(value) : 'н/д');
  return (
    <div className="rounded-patch bg-bg-card border border-line-mid p-4 relative overflow-hidden">
      <div className="text-xs uppercase tracking-wide text-text-mute">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{text}</div>
      <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-accent-red animate-pulse" />
    </div>
  );
}
