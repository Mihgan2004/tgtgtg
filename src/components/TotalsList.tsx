'use client'
export default function TotalsList({
  items,
}: {
  items: { label: string; value: number | null | undefined }[];
}) {
  return (
    <section className="card p-4">
      <h3 className="text-sm uppercase tracking-widest text-neutral-400 mb-3">
        Сводка по всем показателям
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="text-neutral-300">{it.label}</div>
            <div className="font-semibold tabular-nums">
              {Number.isFinite(Number(it.value)) ? Number(it.value) : 0}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
