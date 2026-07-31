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
        highlight: {
          yellow: '#fef08a',
          blue: '#bae6fd',
          pink: '#fbcfe8',
          green: '#bbf7d0',
          purple: '#e9d5ff',
          orange: '#fed7aa',
          gray: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      }
    },
  },
  plugins: [],
}
