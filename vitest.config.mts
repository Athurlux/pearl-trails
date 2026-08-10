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
    // And so is the default 10s for hooks, which is a separate setting. The
    // `beforeAll`/`afterAll` cleanups issue cascading deletes over the same
    // connection and were timing out while every test in the file passed —
    // a red suite that said nothing about the code.
    hookTimeout: 30_000,

    /*
      One database, so one test file at a time.

      Vitest runs files in parallel by default, and every suite here that
      touches the database shares a single Neon branch. Separate cleanup
      markers keep the *rows* apart, but they cannot keep global state apart:
      `visibility.test.ts` unpublishes a property for the length of its suite
      while `queries.test.ts` is asserting the catalogue holds 22 — so the
      count came back 21 and the failure looked like a broken query rather
      than two tests standing on each other.

      This costs wall-clock and buys the whole class of flake. Restore
      parallelism only alongside a per-worker database branch, not by making
      the assertions vaguer — "roughly 22 stays" would pass while the query
      was genuinely wrong.
    */
    fileParallelism: false,
  },
});
