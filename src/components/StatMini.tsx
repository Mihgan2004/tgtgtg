import Sparkline from './Sparkline'

export default function StatMini({
  title, values, current, prev, href
}:{
  title: string
  values: number[]
  current: number
  prev: number
  href?: string
}) {
  const delta = (prev===0) ? '—' : `${(((current - prev)/prev)*100).toFixed(1)}%`
  const content = (
    <div className="card-tight">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-400">{title}</div>
          <div className="mt-1 text-xl font-semibold num">{current}</div>
          <div className="text-xs mt-0.5 text-emerald-300/90">{delta}</div>
        </div>
        <Sparkline data={values} width={200} height={64}/>
      </div>
    </div>
  )
  return href ? <a href={href} className="block hover:brightness-110 transition">{content}</a> : content
}
