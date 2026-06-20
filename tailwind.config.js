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
        ink: '#000000',
        paper: '#FFFFFF',
        surface: '#F5F5F0',
      },
      borderRadius: {
        none: '0px',
        sm: '6px',
        md: '12px',
      },
      fontSize: {
        h1: ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        h2: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        body1: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['13px', { lineHeight: '1.4', fontWeight: '400' }],
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
      },
    },
  },
  plugins: [],
}
