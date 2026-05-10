/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 啟用 class 模式切換深色主題
  theme: {
    extend: {
      colors: {
        // 將 Tailwind 的顏色綁定到我們的 CSS 變數
        theme: {
          bg: 'var(--color-bg-main)',
          card: 'var(--color-bg-card)',
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--color-accent)',
          text: 'var(--color-text-main)',
          muted: 'var(--color-text-muted)',
        }
      }
    },
  },
  plugins: [],
}