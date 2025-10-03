'use client'
import { useEffect, useState } from 'react';

export default function SplashIntro() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem('splashSeen');
    if (!seen) {
      setShow(true);
      const t = setTimeout(() => {
        localStorage.setItem('splashSeen','1');
        setShow(false);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-camo-900/95">
      <div className="relative">
        <div className="absolute -inset-8 animate-pulse rounded-[2rem] bg-emerald-500/5 blur-2xl" />
        <div className="relative px-10 py-8 rounded-2xl border border-white/10 bg-camo-800/90 shadow-[0_8px_48px_rgba(0,0,0,.35)]">
          <div className="text-sm uppercase tracking-[.3em] text-emerald-300/80 text-center">Initializing</div>
          <div className="mt-2 text-2xl md:text-3xl font-semibold text-center">Tactical Ops Dashboard</div>
          <div className="mt-3 text-center text-neutral-400 text-sm">calibrating sensors · arming telemetry · syncing channels</div>
        </div>
      </div>
    </div>
  );
}
