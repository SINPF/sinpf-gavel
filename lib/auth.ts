import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/schema";
import { createAuthMiddleware, APIError } from "better-auth/api";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    microsoft: {
      clientId:     process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      // Lock to SINPF's Azure AD tenant so only org accounts can sign in.
      // Find this in Azure Portal → Entra ID → Overview → Tenant ID.
      tenantId:     process.env.MICROSOFT_TENANT_ID,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const gatedPaths = ["/sign-in/email", "/sign-up/email"];
      if (gatedPaths.some((p) => ctx.path.endsWith(p))) {
        const email = ctx.body?.email?.toLowerCase().trim();

        if (!email || !email.endsWith("@sinpf.org.sb")) {
          throw new APIError("BAD_REQUEST", {
            message: "Access restricted to @sinpf.org.sb emails.",
          });
        }
      }
    }),
  },
});
