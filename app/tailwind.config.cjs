// tailwind.config.cjs
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      zIndex: {
        1: "1",
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        "-1": "-1",
        "-2": "-2",
        "-3": "-3",
      },
      colors: {
        category: {
          hobby: {
            bg: "var(--color-category-hobby-bg)",
          },
          tech: {
            bg: "var(--color-category-tech-bg)",
          },
          other: {
            bg: "var(--color-category-other-bg)",
          },
          uncategorized: {
            bg: "var(--color-category-uncategorized-bg)",
          },
        },
        ui: {
          primary: {
            100: "var(--color-ui-primary-100)",
            400: "var(--color-ui-primary-400)",
            500: "var(--color-ui-primary-500)",
            600: "var(--color-ui-primary-600)",
            700: "var(--color-ui-primary-700)",
            800: "var(--color-ui-primary-800)",
            text: {
              light: "var(--color-ui-primary-text-light)",
              dark: "var(--color-ui-primary-text-dark)",
            },
          },
          danger: {
            100: "var(--color-ui-danger-100)",
            400: "var(--color-ui-danger-400)",
            600: "var(--color-ui-danger-600)",
            700: "var(--color-ui-danger-700)",
            900: "var(--color-ui-danger-900)",
            text: {
              light: "var(--color-ui-danger-text-light)",
              dark: "var(--color-ui-danger-text-dark)",
              200: "var(--color-ui-danger-text-200)",
            },
            border: "var(--color-ui-danger-border)",
            "600-dark": "var(--color-ui-danger-600-dark)",
          },
          success: {
            600: "var(--color-ui-success-600)",
            700: "var(--color-ui-success-700)",
            text: {
              light: "var(--color-ui-success-text-light)",
              dark: "var(--color-ui-success-text-dark)",
            },
          },
        },
        layout: {
          gradient: {
            from: {
              light: "var(--color-layout-gradient-from-light)",
              dark: "var(--color-layout-gradient-from-dark)",
            },
            to: {
              light: "var(--color-layout-gradient-to-light)",
              dark: "var(--color-layout-gradient-to-dark)",
            },
          },
          text: {
            light: "var(--color-layout-text-light)",
            dark: "var(--color-layout-text-dark)",
          },
        },
      },
    },
  },
  safelist: [{ pattern: /(bg|text|border|shadow|outline)-\\[[^\\]]+\\]/ }],
  plugins: [],
};
