/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#12150f',
        surface: '#1b2018',
        elevated: '#232a1f',
        'border-subtle': '#354031',
        'text-primary': '#f4f6ee',
        'text-muted': '#b0b9a8',
        accent: {
          DEFAULT: '#d6fb68',
          hover: '#e6ff9c',
          dim: '#344124',
        },
        purple: {
          dark: '#331436',
          deep: '#4A154B',
          glow: '#682069',
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
