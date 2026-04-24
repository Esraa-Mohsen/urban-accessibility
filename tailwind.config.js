/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkbg: '#0B0F1A',
        glass: 'rgba(30, 41, 59, 0.7)',
      }
    },
  },
  plugins: [],
}
