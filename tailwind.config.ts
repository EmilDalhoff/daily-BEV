import type { Config } from "tailwindcss";

/**
 * Farverne ligger som CSS-variabler i src/index.css (lys + mørk udgave).
 * De gamle navne (board, paper, boardline, accent, signal) er bevaret, så
 * de eksisterende komponenter stadig virker, mens vi bygger dem om én ad gangen.
 */
const farve = (navn: string) => `rgb(var(--${navn}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: farve("board"), // sidens baggrund
        card: farve("card"), // hvide kort
        paper: farve("paper"), // tekst
        boardline: farve("boardline"), // bløde felter/piller
        accent: farve("accent"),
        violet: farve("violet"),
        signal: {
          low: farve("signal-low"),
          mid: farve("signal-mid"),
          high: farve("signal-high"),
        },
      },
      fontFamily: {
        display: ["Nunito", "system-ui", "sans-serif"],
        body: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      boxShadow: {
        soft: "0 12px 32px -14px rgb(50 80 150 / 0.35)",
        pill: "0 8px 18px -8px rgb(80 60 200 / 0.55)",
      },
    },
  },
  plugins: [],
} satisfies Config;