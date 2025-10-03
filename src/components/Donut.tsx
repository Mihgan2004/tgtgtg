'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react';

export type Slice = { label: string; value: number };

function polar(cx:number, cy:number, r:number, a:number){ return [cx + r*Math.cos(a), cy + r*Math.sin(a)]; }
const clamp = (v:number, a=0, b=1)=> Math.min(b, Math.max(a, v));
const easeOut = (t:number)=> 1 - Math.pow(1 - t, 3);

export default function Donut({
  data, size = 168, thickness = 18, caption, className = '',
}: {
  data: Slice[]; size?: number; thickness?: number; caption?: string; className?: string;
}) {
  const total = Math.max(0, data.reduce((s,d)=>s+d.value, 0));
  const cx = size/2, cy = size/2, r = size/2 - 4;

  const fracs = useMemo(()=> total === 0 ? data.map(()=>0) : data.map(d => d.value / total), [data, total]);
  const cum = useMemo(()=> { const a:number[]=[]; let s=0; for (const f of fracs){ a.push(s); s+=f; } return a; }, [fracs]);

  const [prog, setProg] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(()=>{
    let t0 = performance.now();
    const dur = 700;
    const tick = (t:number)=>{
      const p = clamp((t - t0)/dur);
      setProg(easeOut(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return ()=> { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [data]);

  const TAU = Math.PI*2;
  const aStart = -Math.PI/2;
  function pathFor(i:number){
    const f = fracs[i];
    const c0 = cum[i];
    const vis = clamp((prog - c0) / (f || 1));
    if (f === 0 || vis <= 0) return '';
    const a0 = aStart + TAU * c0;
    const a1 = aStart + TAU * (c0 + f*vis);
    const [x0,y0] = polar(cx,cy,r,a0), [x1,y1] = polar(cx,cy,r,a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${cx} ${cy} Z`;
  }

  const shownTotal = Math.round(total * prog);

  return (
    <div className={`flex items-center gap-4 donut-pop ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,.03)" />
        {data.map((d,i)=>(
          <path key={i} d={pathFor(i)} fill={`hsl(${(i*53)%360} 60% 55%)`} opacity={0.92}
                className="transition-transform duration-300 will-change-transform hover:scale-[1.02]" />
        ))}
        <circle cx={cx} cy={cy} r={r - thickness} fill="rgba(0,0,0,.6)" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-white text-base tabular-nums">
          {shownTotal}
        </text>
      </svg>
      <div className="text-xs legend-fade min-w-[160px]">
        {caption && <div className="text-neutral-400 mb-1">{caption}</div>}
        <ul className="space-y-1">
          {data.map((d,i)=>(
            <li key={i} className="flex items-center gap-2">
              <span className="inline-block size-2 rounded" style={{backgroundColor:`hsl(${(i*53)%360} 60% 55%)`}} />
              <span className="text-neutral-300 truncate">{d.label}</span>
              <span className="ml-auto num text-neutral-400">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
