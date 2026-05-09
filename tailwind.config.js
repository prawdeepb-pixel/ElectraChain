/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#06101f",
        "ink-2": "#0b1730",
        grid: "#12385f",
        mint: "#45f7a9",
        cyan: "#4db8ff",
        electric: "#7ce7ff"
      },
      boxShadow: {
        glow: "0 0 38px rgba(69, 247, 169, 0.18)",
        panel: "0 24px 80px rgba(2, 8, 23, 0.44)"
      }
    }
  },
  plugins: []
};
