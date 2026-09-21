import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'ink-black': '#0D1321',
        'deep-space': '#1D2D44',
        'blue-slate': '#3E5C76',
        'dusty-denim': '#748CAB',
        guara: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f6',
          500: '#0e8ce6',
          600: '#026fc4',
          700: '#03589f',
          800: '#074b83',
          900: '#0c3f6e',
          950: '#082849',
        },
        brand: {
          red: '#e11d48',
          gold: '#f59e0b',
          navy: '#0f172a',
        }
      },
    },
  },
  plugins: [],
};

export default config;
