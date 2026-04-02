import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-red':     '#C0392B',
        'brand-green':   '#27AE60',
        'brand-black':   '#1A1A1A',
        'warm-cream':    '#FDF6EC',
        'warm-tan':      '#C8955A',
        'deep-espresso': '#2C1A0E',
        'muted-brown':   '#7A5C3A',
        'fresh-green':   '#D4EDDA',
        'chilled-blue':  '#D0E8FF',
        'frozen-ice':    '#E8F4FD',
        // Legacy aliases for gradual migration
        brand: {
          lilac: '#C8955A',
          purple: '#C0392B',
          dark: '#1A1A1A',
          white: '#FDF6EC',
          cream: '#FDF6EC',
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)"],
        sans: ["var(--font-inter)"],
      },
    },
  },
  plugins: [],
};
export default config;
