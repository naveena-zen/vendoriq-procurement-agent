/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          bg: '#0A0E17',
          sidebar: '#0D1220',
          topbar: '#0D1220',
          card: '#121826',
          cardHover: '#161D2E',
          elevated: '#141B2C',
          divider: '#1E2636',
          border: '#1E2636',
          borderHover: '#2A3448',
        },
        text: {
          primary: '#F1F5F9',
          muted: '#8891A7',
          faint: '#4B5468',
        },
        accent: {
          blue: '#3B82F6',
          violet: '#8B5CF6',
          aiSignal: '#A78BFA',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#F43F5E',
        // Light theme fallback (secondary)
        brand: {
          indigo: '#4338CA',
          indigoHover: '#3730A3',
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
        'card': '0 8px 24px rgba(0,0,0,0.4)',
        'glow-blue': '0 0 24px rgba(59,130,246,0.25)',
        'glow-violet': '0 0 24px rgba(139,92,246,0.20)',
        'glow-green': '0 0 16px rgba(34,197,94,0.20)',
        'level-1': '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.08)',
        'level-2': '0 4px 6px rgba(15,23,42,0.05), 0 10px 15px rgba(15,23,42,0.1)',
        'level-3': '0 10px 15px rgba(15,23,42,0.08), 0 20px 25px rgba(15,23,42,0.1)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
        'gradient-brand-h': 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
      },
      borderRadius: {
        'xl2': '20px',
      }
    },
  },
  plugins: [],
};
