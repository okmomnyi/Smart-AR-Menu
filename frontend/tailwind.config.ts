import type { Config } from 'tailwindcss'

/**
 * Two surfaces, one system.
 *
 * The customer menu is dark because it is read at a table, often in low light,
 * next to the actual food. The admin panel is light because it is a data tool
 * used on a laptop in daylight. Every pairing below was checked against WCAG
 * AA (4.5:1 for body text, 3:1 for large text and UI boundaries); the ratio is
 * noted where it is the reason a value is what it is.
 *
 * The admin tokens resolve through CSS variables so the panel can follow the
 * operating system or a saved preference into a dark theme. Both value sets
 * live in app/globals.css and were checked pair by pair against the same AA
 * thresholds. The menu tokens stay fixed: that surface is dark on purpose.
 *
 * Amber carries the brand. It appears at two strengths because one cannot do
 * both jobs: `accent` (#D4820A) is bright enough to read on the dark menu but
 * only reaches 2.7:1 on the light admin background, so filled buttons and
 * admin text use `accent-strong` / `accent-ink` instead.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Customer menu (dark) ────────────────────────────────────────────
        menu: {
          bg: '#0E0C0A',
          surface: '#16130F',
          raised: '#1F1B16',
          border: 'rgba(245, 240, 232, 0.10)',
          ink: '#F5F0E8', //           18.5:1 on bg
          'ink-muted': '#A79A8D', //    7.1:1 on bg
          'ink-subtle': '#8A7D70', //   4.9:1 on bg — the smallest text we allow
        },

        // ── Admin panel (light) ─────────────────────────────────────────────
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          card: 'rgb(var(--surface-card) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)', //    15.7:1 light, 16.3:1 dark
          muted: 'rgb(var(--ink-muted) / <alpha-value>)', // 5.1:1 light, 6.2:1 dark (worst case)
          inverse: 'rgb(var(--ink-inverse) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
          // Form field edges carry meaning, so they need 3:1 (WCAG 1.4.11).
          field: 'var(--line-field)',
        },

        // ── Brand ───────────────────────────────────────────────────────────
        accent: {
          DEFAULT: '#D4820A', //        6.5:1 on menu.bg
          strong: '#A05F09', //         white text on this reads 5.2:1
          deep: 'rgb(var(--accent-deep) / <alpha-value>)', // 5.7:1 light, 6.0:1 dark on its wash
          ink: 'rgb(var(--accent-deep) / <alpha-value>)',
          on: '#1A1814', //             5.9:1 on accent.DEFAULT
          wash: 'var(--accent-wash)',
        },

        // ── Status ──────────────────────────────────────────────────────────
        positive: {
          DEFAULT: 'rgb(var(--positive) / <alpha-value>)', // 6.1:1 light, 6.4:1 dark on its wash
          on: '#9CB289', //             8.5:1 on menu.bg
          wash: 'var(--positive-wash)',
        },
        critical: {
          DEFAULT: 'rgb(var(--critical) / <alpha-value>)', // 5.5:1 light, 5.5:1 dark on its wash
          on: '#E2714A', //             6.2:1 on menu.bg
          wash: 'var(--critical-wash)',
        },
      },

      // A real scale rather than sizes picked per component.
      // 1.200 minor third, rounded to sensible pixel values.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.625rem' }],
        xl: ['1.375rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.625rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        '3xl': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.5rem', { lineHeight: '2.875rem', letterSpacing: '-0.02em' }],
      },

      // 4px base step. Only these values are used for padding, gap and margin.
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem',
      },

      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },

      fontFamily: {
        display: ['var(--font-display)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Space Mono', 'ui-monospace', 'monospace'],
      },

      boxShadow: {
        card: '0 1px 2px rgba(26, 24, 20, 0.04), 0 4px 12px rgba(26, 24, 20, 0.06)',
        raised: '0 8px 24px rgba(26, 24, 20, 0.12)',
        panel: '-8px 0 32px rgba(0, 0, 0, 0.18)',
        'menu-card': '0 4px 24px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
}

export default config
