/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (flip on `.dark` via CSS vars in index.css) ──
        // Channel-based → Tailwind opacity modifiers work (bg-accent/20 etc.)
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: {
          1: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
          border: "var(--border-strong)",
        },
        hairline: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        fg: {
          DEFAULT: "rgb(var(--fg) / <alpha-value>)",
          secondary: "rgb(var(--fg-secondary) / <alpha-value>)",
          muted: "rgb(var(--fg-muted) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          contrast: "rgb(var(--accent-contrast) / <alpha-value>)",
          soft: "var(--accent-soft)",
          glow: "var(--accent-glow)",
        },
        gold: "rgb(var(--gold) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",

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
        "x-black": "#000000",
        "x-white": "#FFFFFF",
        "x-gray": "#1c1b1b",
        "x-border": "#2f3336",
        "surface-dim": "#0e0e0e",
        "surface-bright": "#3a3939",
        "surface-container-low": "#1c1b1b",
        "border-subtle": "#222222",
        "border-heavy": "#444444",
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      borderRadius: {
        md: "0.625rem",
        lg: "0.875rem",
        xl: "1.125rem",
        "2xl": "1.25rem",
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
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 var(--accent-glow)" },
          "50%": { boxShadow: "0 0 14px 2px var(--accent-glow)" },
        },
      },
      animation: {
        "message-in": "message-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
        shimmer: "shimmer 1.6s linear infinite",
        "dot-pulse": "dot-pulse 1.4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        elevated: "var(--shadow-elevated)",
        glow: "var(--shadow-glow)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      fontFamily: {
        sans: ["Inter", "Inter Tight", "system-ui", "sans-serif"],
        display: ["Inter Tight", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      typography: () => ({
        // Prose tokens reference semantic CSS vars → flip with theme automatically
        DEFAULT: {
          css: {
            "--tw-prose-body": "rgb(var(--fg))",
            "--tw-prose-headings": "rgb(var(--fg))",
            "--tw-prose-bold": "rgb(var(--fg))",
            "--tw-prose-code": "rgb(var(--accent))",
            "--tw-prose-links": "rgb(var(--accent))",
            "--tw-prose-bullets": "rgb(var(--fg-muted))",
            "--tw-prose-counters": "rgb(var(--fg-muted))",
            "--tw-prose-hr": "var(--border)",
            "--tw-prose-quotes": "rgb(var(--fg-secondary))",
            "--tw-prose-quote-borders": "rgb(var(--accent))",
            "--tw-prose-captions": "rgb(var(--fg-muted))",
            "--tw-prose-th-borders": "var(--border)",
            "--tw-prose-td-borders": "var(--border)",
            "--tw-prose-pre-bg": "rgb(var(--surface-2))",
          },
        },
        invert: {
          css: {
            "--tw-prose-body": "rgb(var(--fg))",
            "--tw-prose-headings": "rgb(var(--fg))",
            "--tw-prose-bold": "rgb(var(--fg))",
            "--tw-prose-code": "rgb(var(--accent))",
            "--tw-prose-links": "rgb(var(--accent))",
            "--tw-prose-bullets": "rgb(var(--fg-muted))",
            "--tw-prose-counters": "rgb(var(--fg-muted))",
            "--tw-prose-hr": "var(--border)",
            "--tw-prose-quotes": "rgb(var(--fg-secondary))",
            "--tw-prose-quote-borders": "rgb(var(--accent))",
            "--tw-prose-captions": "rgb(var(--fg-muted))",
            "--tw-prose-th-borders": "var(--border)",
            "--tw-prose-td-borders": "var(--border)",
            "--tw-prose-pre-bg": "#0d1117",
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
