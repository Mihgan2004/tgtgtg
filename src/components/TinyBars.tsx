'use client'
export default function TinyBars({
  values, width=220, height=72, caption="последние 5 дней", className=''
}:{ values:number[]; width?:number; height?:number; caption?:string; className?:string }) {
  const max = Math.max(1, ...values);
  const w = width, h = height, gap = 6;
  const barW = Math.max(8, Math.floor((w - gap*(values.length-1)) / values.length));
  return (
    <div className={className}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9ae6b4"/><stop offset="100%" stopColor="#3c7a5a"/>
          </linearGradient>
        </defs>
        {values.map((v,i)=>{
          const bh = Math.round((v/max)*(h-2));
          const x = i*(barW+gap), y = h-bh;
          return <rect key={i} x={x} y={y} width={barW} height={bh} rx="3" ry="3" fill="url(#g)" opacity="0.9" />;
        })}
      </svg>
      <div className="mt-1 text-[11px] text-neutral-400">{caption}</div>
    </div>
  )
}
