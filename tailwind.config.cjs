/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // RM5 Brand Colors (yangi - mockup'ga moslashtirildi)
        primary: {
          DEFAULT: '#005440',
          light: '#0F6E56',
          dark: '#003828',
        },
        'primary-container': '#0F6E56',
        'primary-fixed': '#A0F3D4',
        'primary-fixed-dim': '#84D6B9',
        'on-primary': '#FFFFFF',
        'on-primary-container': '#9AEDCF',
        secondary: {
          DEFAULT: '#835500',
        },
        'secondary-container': '#FEAE2C',
        'on-secondary-container': '#6B4500',
        tertiary: {
          DEFAULT: '#004D76',
        },
        'tertiary-container': '#00669B',
        accent: {
          DEFAULT: '#F5A623',
        },
        success: '#27AE60',
        warning: '#F5A623',
        danger: '#E74C3C',
        error: '#BA1A1A',
        'error-container': '#FFDAD6',
        bg: {
          DEFAULT: '#F9F9FF',
          subtle: '#F0F3FF',
        },
        background: '#F9F9FF',
        surface: '#F9F9FF',
        'surface-container': '#E7EEFF',
        'surface-container-low': '#F0F3FF',
        'surface-container-high': '#DFE8FD',
        'surface-container-highest': '#DAE3F7',
        'on-surface': '#131C2A',
        'on-surface-variant': '#3F4944',
        'outline': '#6F7A74',
        'outline-variant': '#BEC9C3',
        text: {
          DEFAULT: '#131C2A',
          secondary: '#3F4944',
          muted: '#6F7A74',
        },
        telegram: {
          blue: '#0088CC',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'chip': '8px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
