/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kiewit: {
          black: '#000000',
          panel: '#141414',
          hover: '#262626',
          gold: '#FFCD23',
          goldtext: '#8a7000'
        }
      }
    }
  },
  plugins: []
}
