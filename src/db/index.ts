import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon over HTTP.
 *
 * Cloudflare Workers cannot open raw TCP sockets the way a Node pg pool does,
 * so the HTTP driver is the correct one here — it is a fetch call per query,
 * which also means there is no pool to exhaust across isolates.
 *
 * Server-only. This module must never be imported from a client component:
 * DATABASE_URL contains credentials.
 */

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    // Explicit and loud. A missing connection string is a deployment fault,
    // not something to paper over with an empty result set.
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local for development, or as a Worker secret for production.",
    );
  }

  cached = drizzle(neon(url), { schema });
  return cached;
}

export { schema };
