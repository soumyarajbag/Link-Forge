import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        ink: '#142033',
        paper: '#F8F8F5',
        coral: {
          DEFAULT: '#FF6B61',
          50: '#FFF2F0',
          100: '#FFE1DD',
          600: '#E9554D',
        },
        mint: '#CBEBDD',
        lilac: '#DCD5FF',
        sky: '#D9EEF4',
        sand: '#EFE9DE',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(20, 32, 51, 0.08)',
        lift: '0 24px 70px rgba(20, 32, 51, 0.14)',
        focus: '0 0 0 4px rgba(255, 107, 97, 0.16)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '4xl': '2rem',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        pulseDot: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(74, 183, 128, .28)' },
          '50%': { boxShadow: '0 0 0 7px rgba(74, 183, 128, 0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'slide-up': 'slide-up .55s cubic-bezier(.22,1,.36,1) both',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'accordion-down': 'accordion-down .2s ease-out',
        'accordion-up': 'accordion-up .2s ease-out',
      },
    },
  },
  plugins: [animate],
};

export default config;
