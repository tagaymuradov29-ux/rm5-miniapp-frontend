/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // RM5 Brand Colors
        primary: {
          DEFAULT: '#0F6E56',
          light: '#3D9F87',
          dark: '#0A5443',
        },
        accent: {
          DEFAULT: '#F5A623',
        },
        success: '#27AE60',
        warning: '#F5A623',
        danger: '#E74C3C',
        bg: {
          DEFAULT: '#F8F7F4',
          subtle: '#F1EFE8',
        },
        text: {
          DEFAULT: '#1A2332',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        telegram: {
          blue: '#0088CC',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'sans-serif'],
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
