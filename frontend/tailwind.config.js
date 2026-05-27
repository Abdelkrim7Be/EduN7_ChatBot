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
      },
      animation: {
        "message-in": "message-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
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
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
