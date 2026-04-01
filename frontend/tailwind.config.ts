import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F5F0E8',
        'warm-white': '#FDFAF5',
        charcoal: '#1A1814',
        brown: '#3D2B1F',
        amber: {
          DEFAULT: '#D4820A',
          light: '#F0A830',
          glow: '#FFD580',
        },
        rust: '#C14B1E',
        sage: '#6B7C5E',
        muted: '#8A7D70',
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        dm: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      backgroundImage: {
        'amber-gradient': 'linear-gradient(135deg, #D4820A, #F0A830)',
      },
    },
  },
  plugins: [],
}

export default config
