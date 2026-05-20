/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-surface-variant": "#414752",
        "outline": "#717783",
        "primary": "#005caa",
        "on-secondary": "#ffffff",
        "on-secondary-fixed": "#0b1c30",
        "on-tertiary": "#ffffff",
        "surface": "#faf8ff",
        "surface-container": "#eaedff",
        "inverse-on-surface": "#eef0ff",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "on-tertiary-fixed-variant": "#005236",
        "primary-fixed": "#d4e3ff",
        "tertiary-fixed": "#6ffbbe",
        "primary-container": "#2775ca",
        "secondary-fixed": "#d3e4fe",
        "on-tertiary-container": "#f4fff6",
        "inverse-primary": "#a5c8ff",
        "on-secondary-container": "#54647a",
        "surface-bright": "#faf8ff",
        "secondary-container": "#d0e1fb",
        "background": "#faf8ff",
        "tertiary-fixed-dim": "#4edea3",
        "error": "#ba1a1a",
        "surface-dim": "#d2d9f4",
        "on-primary": "#ffffff",
        "on-secondary-fixed-variant": "#38485d",
        "surface-variant": "#dae2fd",
        "surface-tint": "#005faf",
        "tertiary-container": "#00855b",
        "on-primary-fixed-variant": "#004786",
        "on-primary-container": "#fcfbff",
        "surface-container-lowest": "#ffffff",
        "secondary": "#505f76",
        "on-tertiary-fixed": "#002113",
        "inverse-surface": "#283044",
        "error-container": "#ffdad6",
        "surface-container-high": "#e2e7ff",
        "on-surface": "#131b2e",
        "secondary-fixed-dim": "#b7c8e1",
        "on-background": "#131b2e",
        "outline-variant": "#c1c6d3",
        "tertiary": "#006947",
        "on-primary-fixed": "#001c3a",
        "surface-container-highest": "#dae2fd",
        "surface-container-low": "#f2f3ff",
        "primary-fixed-dim": "#a5c8ff"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "16px",
        "container-padding-desktop": "24px",
        "widget-width": "400px",
        "unit": "8px",
        "container-padding-mobile": "16px"
      },
      fontFamily: {
        "label-md": ["Hanken Grotesk"],
        "body-lg": ["Hanken Grotesk"],
        "label-sm": ["Hanken Grotesk"],
        "headline-lg-mobile": ["Hanken Grotesk"],
        "headline-xl": ["Hanken Grotesk"],
        "headline-lg": ["Hanken Grotesk"],
        "body-md": ["Hanken Grotesk"]
      },
      fontSize: {
        "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "500" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "label-sm": ["12px", { "lineHeight": "16px", "fontWeight": "600" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "headline-xl": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
