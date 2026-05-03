/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Display: Fraunces — a contemporary serif with academic gravitas.
        //   Alternatives sans italic: 'Source Serif 4', 'Crimson Pro'
        display: ['Fraunces', 'Georgia', 'serif'],
        // Body: Geist Sans — a refined, neutral grotesque. Modern, slightly
        // characterful, pairs well with Fraunces. Widely used on researcher pages.
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        // Mono: Geist Mono for code and metadata.
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Restrained palette. Background is warm near-white (#FAF8F5), not pure
        // white — reduces fatigue, feels like paper. Accent is a deep oxblood,
        // used sparingly for emphasis and links.
        paper: '#FAF8F5',
        ink: {
          DEFAULT: '#1A1A1A',
          muted: '#4A4A4A',
          soft: '#6B6B6B',
          faint: '#9A9A9A',
        },
        rule: '#E8E4DC',
        accent: {
          DEFAULT: '#7A1F2B', // oxblood
          muted: '#A4303F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          warm: '#F4F0E8',
        },
      },
      fontSize: {
        // Tight, editorial scale
        'xs': ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.02em' }],
        'sm': ['0.875rem', { lineHeight: '1.4rem' }],
        'base': ['1rem', { lineHeight: '1.7rem' }],
        'lg': ['1.125rem', { lineHeight: '1.85rem' }],
        'xl': ['1.375rem', { lineHeight: '1.9rem' }],
        '2xl': ['1.75rem', { lineHeight: '2.15rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '4xl': ['3rem', { lineHeight: '3.15rem', letterSpacing: '-0.02em' }],
        '5xl': ['4rem', { lineHeight: '4.1rem', letterSpacing: '-0.025em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        'ultra-wide': '0.22em',
      },
      maxWidth: {
        prose: '68ch',
        'prose-wide': '78ch',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
