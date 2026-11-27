/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope Variable', 'Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // vert sapin : couleur de structure (barre latérale, en-têtes, boutons)
        brand: {
          50: '#eef6f4',
          100: '#d9ebe7',
          200: '#b5d7cf',
          300: '#7fc7ba',
          400: '#57b3a3',
          500: '#3a9887',
          600: '#2a7d72',
          700: '#1f655d',
          800: '#164e48',
          900: '#0c3834',
          950: '#071e1c',
        },
        // vert tilleul : accent (chiffres clés, mise en avant, actions)
        lime: {
          100: '#f1f9df',
          200: '#e4f3c3',
          300: '#d2ec9c',
          400: '#bfe176',
          500: '#a3cc4f',
          600: '#8cb93f',
          700: '#6e9230',
        },
        // fond profond : base du thème sombre
        canvas: {
          DEFAULT: '#0a1211',
          deep: '#060c0b',
          raised: '#0e1a19',
        },
        // surfaces translucides (effet verre)
        surface: {
          DEFAULT: 'rgb(255 255 255 / 0.05)',
          strong: 'rgb(255 255 255 / 0.075)',
          soft: 'rgb(255 255 255 / 0.045)',
          muted: 'rgb(255 255 255 / 0.025)',
          inset: 'rgb(4 12 11 / 0.45)',
          dark: '#101d1c',
        },
        // texte
        ink: {
          DEFAULT: '#e9f3f1',
          strong: '#ffffff',
          muted: '#9db2af',
          faint: '#6d8280',
          dim: '#536663',
        },
        // filets et séparateurs
        line: {
          DEFAULT: 'rgb(255 255 255 / 0.10)',
          soft: 'rgb(255 255 255 / 0.06)',
          strong: 'rgb(255 255 255 / 0.13)',
        },
      },
      borderRadius: {
        '4xl': '28px',
        '5xl': '34px',
      },
      boxShadow: {
        // profondeur douce : carte posée sur le fond
        card: 'inset 0 1px 0 0 rgb(255 255 255 / 0.06), 0 24px 48px -24px rgb(0 0 0 / 0.85)',
        'card-lg': 'inset 0 1px 0 0 rgb(255 255 255 / 0.08), 0 32px 64px -28px rgb(0 0 0 / 0.9)',
        float: 'inset 0 1px 0 0 rgb(255 255 255 / 0.10), 0 18px 36px -12px rgb(0 0 0 / 0.75)',
        // halo coloré, réservé aux chiffres héros
        glow: '0 0 0 1px rgb(255 255 255 / 0.06), 0 0 44px -8px rgb(163 204 79 / 0.45)',
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(120% 120% at 50% 0%, rgb(255 255 255 / 0.08) 0%, rgb(255 255 255 / 0.02) 45%, transparent 100%)',
        'sheen': 'linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 0.10) 50%, transparent 70%)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        rise: 'rise .45s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .3s ease both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
