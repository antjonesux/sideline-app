/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        sans: ["var(--font-barlow)", "sans-serif"],
        display: ["var(--font-barlow-condensed)", "sans-serif"],
      },
    },
  },
};

export default config;
