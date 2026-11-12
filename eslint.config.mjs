import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "src/__tests__/**",
    "scripts/**",
  ]),
  // ── File-size rules (all source files) ────────────────────────────────────
  {
    rules: {
      // Files over 300 lines (excluding blanks/comments) are a split candidate.
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 5],
    },
  },
  // ── Function-size rule (logic files only, not TSX component render bodies) ─
  {
    files: ["**/*.ts"],
    rules: {
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true }],
    },
  },
]);
