import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0F",        // primary background
        charcoal: "#15151D",   // secondary background
        slate: "#20202B",      // cards and panels
        crimson: { DEFAULT: "#8B1E2D", light: "#D4596B" }, // light = readable on dark for text/links
        silver: "#C4C7D0",
        snow: "#F5F5F7",
        muted: "#9B9BA8",
        emerald: { DEFAULT: "#2F8F6B", light: "#4FB58E" },
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(196,199,208,0.18), 0 10px 40px -12px rgba(139,30,45,0.45)",
        panel: "0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 32px -16px rgba(0,0,0,0.7)",
      },
    },
  },
  plugins: [],
};
export default config;
