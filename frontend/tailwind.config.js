/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f1a',
        surface: '#1a1a2e',
        surface2: '#252542',
        primary: '#8b5cf6',
        primaryHover: '#7c3aed',
        primaryLight: '#a78bfa',
        text: '#ffffff',
        textSecondary: '#a0a0b0',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
      }
    },
  },
  plugins: [],
}
