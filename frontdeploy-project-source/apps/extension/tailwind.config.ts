import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        axiom: {
          bg: "#0A0A0B",
          panel: "#121214",
          border: "#27272A",
          text: "#FAFAFA",
          muted: "#A1A1AA",
          accent: "#3B82F6",
          good: "#22C55E",
          warn: "#EAB308",
          bad: "#EF4444"
        }
      }
    }
  },
  plugins: []
}

export default config
