/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#EEF6FC', 100: '#DDEEF9', 200: '#BFDDF1', 500: '#2F82BD', 600: '#21689C', 700: '#1B5583', 800: '#174B72' },
        leaf: { 50: '#EAF7F0', 100: '#DDF3E8', 500: '#33A073', 600: '#267A59', 700: '#1E6B4E' },
        ink: '#16324A',
        muted: '#4F677B',
        line: '#D5E5EF',
        canvas: '#F3F9FC'
      },
      fontFamily: {
        display: ['Fredoka', 'ui-rounded', 'Hiragino Maru Gothic ProN', 'Segoe UI', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'Noto Sans Telugu', 'Noto Sans Kannada', 'ui-rounded', 'Segoe UI', 'system-ui', 'sans-serif']
      },
      boxShadow: { card: '0 1px 2px rgba(22,50,74,.06), 0 14px 34px -18px rgba(33,104,156,.35)' },
      keyframes: {
        ring: { '0%': { boxShadow: '0 0 0 0 rgba(220,38,38,.45)' }, '100%': { boxShadow: '0 0 0 18px rgba(220,38,38,0)' } },
        rise: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } }
      },
      animation: { ring: 'ring 1.4s ease-out infinite', rise: 'rise .35s ease-out both' }
    }
  },
  plugins: []
};
