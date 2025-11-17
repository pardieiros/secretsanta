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
          DEFAULT: '#135F5C',
          light: '#187670',
        },
        secondary: {
          DEFAULT: '#D65448',
          light: '#E56B5F',
        },
        background: '#FFF8F0',
        surface: '#F5D7B2',
        'border-soft': '#E6C8A3',
        text: {
          main: '#1A1A1A',
          secondary: '#4A4A4A',
          'on-dark': '#FFFFFF',
        },
        success: '#2F855A',
        warning: '#D69E2E',
        error: '#E53E3E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

