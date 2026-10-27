/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './index.js',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#141414',
        cream: '#FBF3EA',
        offwhite: '#F5EDE0',
        coral: '#FF6B6B',
        lavender: '#B59CDD',
        teal: '#4ECDC4',
        yellow: '#FFD93D',
        orange: '#FF9F5A',
        'brand-lavender': '#9A7DD0',
        'brand-gold': '#E8B84B',
        parchment: '#EDE5D1',
      },
      fontFamily: {
        body: ['DM Sans', 'Segoe UI', 'System'],
        display: ['SpaceGrotesk-Bold', 'Segoe UI', 'System'],
        sans: ['DM Sans', 'Segoe UI', 'System'],
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
      borderRadius: {
        card: '12px',
        button: '10px',
        input: '10px',
        small: '6px',
        icon: '8px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
