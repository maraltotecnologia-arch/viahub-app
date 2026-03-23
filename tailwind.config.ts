import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0037b0",
          foreground: "hsl(var(--primary-foreground))",
          container: "#1d4ed8",
          fixed: "#d8e2ff",
          "fixed-dim": "#adc6ff",
        },
        secondary: {
          DEFAULT: "#006591",
          foreground: "hsl(var(--secondary-foreground))",
          container: "#c8e6ff",
          fixed: "#c8e6ff",
          "fixed-dim": "#8bcdff",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        /* Digital Architect — Material 3 tonal palette */
        "on-primary": "#ffffff",
        "on-primary-container": "#d6e4ff",
        "on-primary-fixed": "#001a42",
        "on-primary-fixed-variant": "#004395",
        "inverse-primary": "#adc6ff",

        "on-secondary": "#ffffff",
        "on-secondary-container": "#001e2e",
        "on-secondary-fixed": "#001e2e",
        "on-secondary-fixed-variant": "#004c6e",

        "tertiary": "#006591",
        "tertiary-container": "#c8e6ff",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#001e2e",
        "tertiary-fixed": "#c8e6ff",
        "tertiary-fixed-dim": "#8bcdff",
        "on-tertiary-fixed": "#001e2e",
        "on-tertiary-fixed-variant": "#004c6e",

        "surface": "var(--surface)",
        "surface-dim": "var(--surface-dim, #d8daea)",
        "surface-bright": "var(--surface-bright, #f8f9ff)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "surface-variant": "var(--surface-variant, #dce3f3)",
        "surface-tint": "#0037b0",

        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        "on-background": "var(--on-surface)",
        "inverse-surface": "#2e3043",
        "inverse-on-surface": "#eef0ff",
        "outline": "#74778f",
        "outline-variant": "#c4c6de",

        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#410002",

        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        "ambient": "0 8px 24px 0 rgba(13,28,45,0.06)",
        "ambient-lg": "0 24px 60px rgba(13,28,45,0.14)",
        "ambient-md": "0 8px 24px 0 rgba(13,28,45,0.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
