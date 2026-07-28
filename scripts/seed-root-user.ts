import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { createInterface } from "node:readline/promises";
import { db } from "@/db";
import { account, user } from "@/db/schema";
import { auth } from "@/lib/auth";

const EMAIL = "btupiti@sinpf.org.sb";
const NAME = "Root Admin";

async function promptPassword(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Password for ${EMAIL}: `);
  rl.close();
  return answer.trim();
}

async function main() {
  const password = process.argv[2] ?? (await promptPassword());
  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, EMAIL))
    .limit(1);

  if (!existing) {
    await auth.api.signUpEmail({
      body: { email: EMAIL, password, name: NAME },
    });
    console.log(`Created ${EMAIL} with password.`);
    process.exit(0);
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);

  const [credAccount] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")))
    .limit(1);

  if (credAccount) {
    await db
      .update(account)
      .set({ password: hash })
      .where(eq(account.id, credAccount.id));
    console.log(`Updated password for existing user ${EMAIL}.`);
  } else {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      userId: existing.id,
      accountId: existing.id,
      providerId: "credential",
      password: hash,
    });
    console.log(`Added credential account with password for existing user ${EMAIL}.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
