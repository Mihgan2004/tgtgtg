'use client'
import React from 'react'

type Props = {
  data: number[]
  width?: number
  height?: number
  strokeWidth?: number
  className?: string
}

export default function Sparkline({
  data,
  width = 160,
  height = 48,
  strokeWidth = 2,
  className = '',
}: Props) {
  if (!data?.length) return <div className={className} style={{ width, height }} />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const toY = (v: number) => height - ((v - min) / range) * height

  const d = data.map((v, i) => `${i ? 'L' : 'M'} ${i * stepX} ${toY(v)}`).join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`block ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3c7a5a" />
          <stop offset="100%" stopColor="#9ae6b4" />
        </linearGradient>
      </defs>
      <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,.08)" strokeWidth="1"/>
      <path d={d} fill="none" stroke="url(#spark-grad)" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
