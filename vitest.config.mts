import path from "node:path";
import { defineConfig } from "vitest/config";

const src = path.resolve(process.cwd(), "src");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${src}/` },
      // `server-only` exists to fail loudly inside a client bundle. Under
      // Vitest there is no client bundle, so it is stubbed out rather than
      // removed from the source it is protecting.
      { find: /^server-only$/, replacement: path.resolve(src, "test/server-only-stub.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Neon over HTTP is a network round trip; the default 5s is tight on a
    // cold compute.
    testTimeout: 20_000,
  },
});
