'use client';
import { useState } from 'react';

interface Props {
  data: any;
  label?: string;
}

export default function DebugPanel({ data, label = 'Debug Data' }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // В продакшене можно скрыть через env
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-sm font-medium shadow-lg backdrop-blur transition-all"
      >
        🐛 {label}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-96 max-h-96 overflow-auto rounded-lg bg-camo-900/95 border border-amber-500/30 shadow-2xl backdrop-blur-md">
          <div className="sticky top-0 bg-amber-600/90 px-4 py-2 flex items-center justify-between">
            <span className="font-semibold text-white text-sm">Debug: {label}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-neutral-200 transition-colors"
            >
              ✕
            </button>
          </div>
          <pre className="p-4 text-xs text-neutral-300 font-mono overflow-x-auto custom-scrollbar">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}