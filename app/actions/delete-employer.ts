"use server";

import { db } from "@/db";
import { employers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function deleteEmployer(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  await db.delete(employers).where(eq(employers.id, id));

  revalidatePath("/employers");
}
