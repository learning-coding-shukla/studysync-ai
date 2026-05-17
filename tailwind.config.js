/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    animate,
    typography,
  ],
};
