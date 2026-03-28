/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: [],
  theme: {
    extend: {
      colors: {
        // Primary accent
        primary: {
          DEFAULT: "#3b82f6",
          dark: "#1d4ed8",
          light: "#eff6ff",
        },
        // Signal direction colors
        signal: {
          buy: "#22c55e",
          sell: "#ef4444",
          neutral: "#6b7280",
        },
        // Quality tag colors
        quality: {
          high: "#f59e0b",
          low: "#9ca3af",
          premium: "#a855f7",
        },
        // Surface / background tokens (dark-first)
        surface: {
          DEFAULT: "#0f1117",
          card: "#1a1d27",
          elevated: "#22263a",
          border: "#2a2d3e",
        },
        // Text tokens
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        card: "0.75rem",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

module.exports = config;
