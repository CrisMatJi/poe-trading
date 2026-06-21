/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta tipo terminal de trading (oscura, profunda)
        base: {
          950: '#070910',
          900: '#0a0d13',
          800: '#0f131c',
          700: '#161c28',
          600: '#1f2735',
          500: '#2b3547',
          400: '#3a4659',
        },
        up: { DEFAULT: '#22c55e', soft: 'rgba(34,197,94,0.14)' },
        down: { DEFAULT: '#ef4444', soft: 'rgba(239,68,68,0.14)' },
        // Acento dorado estilo Path of Exile
        accent: {
          DEFAULT: '#e8b14c',
          400: '#f0c674',
          600: '#c8902f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(232,177,76,0.25), 0 8px 30px -8px rgba(232,177,76,0.25)',
        panel: '0 10px 40px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
