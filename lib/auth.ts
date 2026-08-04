import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  socialProviders: {
    microsoft: {
      clientId:     process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      // Lock to SINPF's Azure AD tenant so only org accounts can sign in.
      // Find this in Azure Portal → Entra ID → Overview → Tenant ID.
      tenantId:     process.env.MICROSOFT_TENANT_ID,
    },
  },
});
