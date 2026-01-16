/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a365d', // Deep blue
          light: '#2c5282',
          dark: '#153e75',
        },
        accent: {
            DEFAULT: '#38b2ac', // Soft teal
            light: '#81e6d9',
        }
      }
    },
  },
  plugins: [],
}
