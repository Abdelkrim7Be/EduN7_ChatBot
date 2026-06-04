/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0077B6",
          "blue-dark": "#005F92",
          "blue-light": "#4BA3D3",
          gold: "#F4A800",
          "gold-dark": "#D4920A",
          navy: "#1E3A5F",
          "navy-light": "#264975",
          "navy-border": "#2D5080",
          surface: "#FFFFFF",
          "surface-muted": "#F0F7FF",
          gray: "#E2EEF7",
          "gray-mid": "#B8D0E8",
          "gray-text": "#5B7FA6",
        },
      },
      keyframes: {
        "message-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "dot-pulse": {
          "0%, 60%, 100%": { opacity: "0.25", transform: "scale(0.85)" },
          "30%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "message-in": "message-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
        shimmer: "shimmer 1.6s linear infinite",
        "dot-pulse": "dot-pulse 1.4s ease-in-out infinite",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(30, 58, 95, 0.08)",
        elevated:
          "0 8px 24px -6px rgba(30, 58, 95, 0.12), 0 2px 6px -1px rgba(30, 58, 95, 0.06)",
        glow: "0 0 0 3px rgba(0, 119, 182, 0.15), 0 6px 20px -4px rgba(0, 119, 182, 0.35)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      fontFamily: {
        display: ["Inter Tight", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      typography: () => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": "#1E3A5F",
            "--tw-prose-headings": "#1E3A5F",
            "--tw-prose-bold": "#1E3A5F",
            "--tw-prose-code": "#0077B6",
            "--tw-prose-links": "#0077B6",
            "--tw-prose-bullets": "#4BA3D3",
            "--tw-prose-counters": "#4BA3D3",
            "--tw-prose-hr": "#E2EEF7",
            "--tw-prose-quotes": "#1E3A5F",
            "--tw-prose-quote-borders": "#0077B6",
            "--tw-prose-captions": "#5B7FA6",
            "--tw-prose-th-borders": "#E2EEF7",
            "--tw-prose-td-borders": "#E2EEF7",
          },
        },
        invert: {
          css: {
            "--tw-prose-body": "rgba(255,255,255,0.85)",
            "--tw-prose-headings": "#ffffff",
            "--tw-prose-bold": "#ffffff",
            "--tw-prose-code": "#4BA3D3",
            "--tw-prose-links": "#4BA3D3",
            "--tw-prose-bullets": "#4BA3D3",
            "--tw-prose-counters": "#4BA3D3",
            "--tw-prose-hr": "#2D5080",
            "--tw-prose-quotes": "rgba(255,255,255,0.85)",
            "--tw-prose-quote-borders": "#0077B6",
            "--tw-prose-captions": "rgba(255,255,255,0.5)",
            "--tw-prose-th-borders": "#2D5080",
            "--tw-prose-td-borders": "#2D5080",
            "--tw-prose-pre-bg": "#0d1117",
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
