import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare adapter output — generated and bundled, never hand-edited.
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
    // Local scratch: gitignored throwaway scripts, not part of the project.
    "tmp/**",
  ]),
]);

export default eslintConfig;
