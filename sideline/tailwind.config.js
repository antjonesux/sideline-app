/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)"],
        sans: ["var(--font-barlow)"],
        display: ["var(--font-barlow-condensed)"],
      },
    },
  },
};

export default config;
