/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8f2e7',
        surface: '#fffaf2',
        elevated: '#f0e8db',
        'border-subtle': '#ded3c3',
        'text-primary': 'var(--text)',
        'text-muted': '#63596a',
        accent: {
          DEFAULT: '#663da6',
          hover: '#523180',
          dim: '#dac4f5',
        },
        purple: {
          dark: '#412d5d',
          deep: '#663da6',
          glow: '#ad88e4',
        },
        status: {
          success: '#2A7B4C',
          warning: '#D97706',
          error: '#B91C1C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
