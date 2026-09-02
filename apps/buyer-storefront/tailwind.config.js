/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './data/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  safelist: [
    'col-span-12',
    'md:col-span-7',
    'md:col-span-5',
    'md:col-span-6',
    'md:row-span-2',
    'min-h-[320px]',
    'min-h-[340px]',
    'min-h-[600px]',
    'min-h-[640px]'
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      colors: {
        paleo: {
          dark: '#1F1E1B',
          light: '#FAF8F5',
          terracotta: '#C85A32',
          muted: '#625D54',
          border: '#E8E4DC',
          subtle: '#EFECE6'
        }
      }
    }
  },
  plugins: []
};
