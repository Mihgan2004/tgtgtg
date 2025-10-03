import Sparkline from './Sparkline'

export default function StatCard(props: {
  title: string
  value: string | number
  delta?: string
  series?: number[]
}) {
  const { title, value, delta, series = [] } = props
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-400">{title}</div>
          <div className="mt-1 text-2xl font-semibold num">{value}</div>
          {delta && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-300/90">
              <span>▲</span><span>{delta}</span>
            </div>
          )}
        </div>
        <Sparkline data={series} width={160} height={48} className="-mr-1 -mt-1" />
      </div>
    </div>
  )
}
