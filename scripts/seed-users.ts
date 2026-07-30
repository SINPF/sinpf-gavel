import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

async function main() {
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Migrations applied.");

  const filePath = join(process.cwd(), "scripts", "users.txt");
  const contents = readFileSync(filePath, "utf-8");

  const lines = contents
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) {
      console.warn(`Malformed line, skipping: ${line}`);
      failed++;
      continue;
    }
    const [name, email, password] = parts;

    if (password.length < 8) {
      console.warn(`Password too short for ${email}, skipping.`);
      failed++;
      continue;
    }

    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing) {
      console.log(`Exists · skipping ${email}`);
      skipped++;
      continue;
    }

    try {
      await auth.api.signUpEmail({ body: { email, password, name } });
      console.log(`Created ${email}`);
      created++;
    } catch (err) {
      console.error(`Failed to create ${email}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
