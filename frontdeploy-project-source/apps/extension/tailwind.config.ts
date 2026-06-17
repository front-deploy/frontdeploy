import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        axiom: {
          bg: "#F7F7F2",
          panel: "#FFFFFF",
          border: "#111111",
          text: "#111111",
          muted: "#6F6F68",
          accent: "#111111",
          good: "#0B7A3B",
          warn: "#9A6700",
          bad: "#B42318"
        }
      }
    }
  },
  plugins: []
}

export default config
