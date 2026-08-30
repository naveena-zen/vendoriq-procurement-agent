/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          indigo: '#4338ca',
          indigoHover: '#3730a3',
        },
        ai: {
          accent: '#7C3AED',
          light: '#F5F3FF',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'level-1': '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.08)',
        'level-2': '0 4px 6px rgba(15,23,42,0.05), 0 10px 15px rgba(15,23,42,0.1)',
        'level-3': '0 10px 15px rgba(15,23,42,0.08), 0 20px 25px rgba(15,23,42,0.1)',
      }
    },
  },
  plugins: [],
};
