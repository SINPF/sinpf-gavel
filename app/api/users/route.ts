import { db } from "@/db";
import { user } from "@/db/schema";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .orderBy(asc(user.name));

  return NextResponse.json(rows);
}
