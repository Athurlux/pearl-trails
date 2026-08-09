import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Release 1 is a single static-leaning page, so the defaults are correct.
// Incremental cache / tag cache configuration belongs here once there is a
// database-backed route worth caching.
export default defineCloudflareConfig();
