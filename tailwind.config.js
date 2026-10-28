/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          950: "#040814",
          900: "#070e22",
          850: "#0b1533",
          800: "#0f1d47",
          700: "#162b69",
          600: "#1d3b90",
        },
        brand: {
          royal: "#1e40af",
          blue: "#2563eb",
          electric: "#3b82f6",
          cyan: "#06b6d4",
        },
        cta: {
          yellow: "#f59e0b",
          amber: "#d97706",
          orange: "#ea580c",
          gold: "#eab308",
        },
      },
    },
  },
  plugins: [],
};
