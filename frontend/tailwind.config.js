/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#5645ee",
          "purple-dark": "#4535dd",
          "purple-light": "#7b6ef5",
          gray: "#36353f",
          "gray-light": "#4a4958",
          surface: "#1a1a24",
          black: "#000000",
        },
      },
      typography: (theme) => ({
        invert: {
          css: {
            "--tw-prose-body": theme("colors.gray[200]"),
            "--tw-prose-headings": theme("colors.white"),
            "--tw-prose-bold": theme("colors.white"),
            "--tw-prose-code": theme("colors.brand.purple-light"),
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
