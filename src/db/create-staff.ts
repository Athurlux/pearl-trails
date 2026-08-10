import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { staffUsers } from "./schema";
import { hashPassword } from "@/lib/staff-crypto";
import { STAFF_ROLES, type StaffRole } from "@/lib/staff-vocab";

/**
 * Creates or updates an operations account.
 *
 *   npm run staff:create
 *
 * Interactive on purpose. The password is prompted for and never read from an
 * argument or an environment variable, because both end up in shell history,
 * process listings and CI logs. There is no seeded default account anywhere in
 * this repository — a committed default credential is a public credential.
 *
 * Running it again for an existing email resets that account's password and
 * role, which is also how a forgotten password is dealt with: there is no
 * self-service reset flow, and for a handful of internal accounts there does
 * not need to be one.
 */

config({ path: ".env.local" });

const MIN_PASSWORD = 12;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local first.");
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const email = (await rl.question("Email: ")).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("That does not look like an email address.");
    }

    const name = (await rl.question("Full name: ")).trim();
    if (!name) throw new Error("A name is required — it is what audit rows show.");

    const roleInput = (
      await rl.question(`Role (${STAFF_ROLES.join(" / ")}) [operations]: `)
    )
      .trim()
      .toLowerCase();
    const role = (roleInput || "operations") as StaffRole;
    if (!STAFF_ROLES.includes(role)) {
      throw new Error(`Role must be one of: ${STAFF_ROLES.join(", ")}`);
    }

    const password = await rl.question(`Password (min ${MIN_PASSWORD} characters): `);
    if (password.length < MIN_PASSWORD) {
      throw new Error(`Too short — use at least ${MIN_PASSWORD} characters.`);
    }
    const again = await rl.question("Confirm password: ");
    if (password !== again) throw new Error("Those did not match.");

    const passwordHash = await hashPassword(password);
    const db = getDb();

    const [existing] = await db
      .select({ id: staffUsers.id })
      .from(staffUsers)
      .where(eq(staffUsers.email, email))
      .limit(1);

    if (existing) {
      await db
        .update(staffUsers)
        .set({ name, role, passwordHash, isActive: true, updatedAt: new Date() })
        .where(eq(staffUsers.id, existing.id));
      console.log(`\nUpdated ${email} (${role}). Their previous password no longer works.`);
    } else {
      await db.insert(staffUsers).values({ email, name, role, passwordHash });
      console.log(`\nCreated ${email} (${role}). Sign in at /ops/sign-in.`);
    }

    console.log("Existing sessions are unaffected — sign out to end them.");
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
