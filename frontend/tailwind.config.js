/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [animate],
};
