import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        camo: {
          950: '#07100b',
          900: '#0b1b12',
          800: '#102319',
          700: '#143021',
          600: '#1b3c2a',
          500: '#254d38',
          400: '#2f6047',
          300: '#3c7a5a',
        },
      },
      boxShadow: {
        soft: '0 6px 24px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.03)',
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
