/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0A0D',
        surface: '#121116',
        elevated: '#19171D',
        'border-subtle': '#25232B',
        'text-primary': '#F3F0F2',
        'text-muted': '#918B94',
        accent: {
          DEFAULT: '#8B1E3F',
          hover: '#A32349',
          dim: '#4A0E17',
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
