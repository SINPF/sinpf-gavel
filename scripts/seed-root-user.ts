import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

const NAME = "Root Admin";

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email) {
    console.error("SUPER_ADMIN_EMAIL is not set.");
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("SUPER_ADMIN_PASSWORD must be set and at least 8 characters.");
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    console.error(`User ${email} already exists.`);
    process.exit(1);
  }

  await auth.api.signUpEmail({
    body: { email, password, name: NAME },
  });
  console.log(`Created ${email}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
