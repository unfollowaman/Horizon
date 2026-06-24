/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-blue': '#0000FF',
        'accent-red': '#FF0000',
        'accent-yellow': '#FFFF00',
        'accent': '#E11584',
        ink: '#000000',
        paper: '#FFFFFF',
        surface: '#F0F1F5',
      },
      borderRadius: {
        none: '0px',
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        full: '9999px',
      },
      fontSize: {
        h1: ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        h2: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        body1: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'display-hero': ['68px', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.02em' }],
        'display-section': ['40px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'heading-card': ['20px', { lineHeight: '1.4', fontWeight: '700' }],
        'body-large': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-base': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0.1em' }],
      },
      spacing: {
        1: '8px',
        2: '16px',
        3: '24px',
        4: '32px',
        5: '48px',
        6: '64px',
      },
      boxShadow: {
        elevated: '4px 4px 0px 0px #000000',
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'nav': '0 8px 32px rgba(0, 0, 0, 0.04)',
        'footer': '0 -4px 24px rgba(0, 0, 0, 0.02)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.04), 0 16px 32px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}