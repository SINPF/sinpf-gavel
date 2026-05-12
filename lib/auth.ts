import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/schema";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const message =
          type === "sign-in"
            ? `Your sign-in code is: ${otp}`
            : `Verify your email with this code: ${otp}`;

        await resend.emails.send({
          from: "SINPF Auth <auth@resend.dev>",
          to: email,
          subject: "Your Verification Code",
          text: message,
        });
      },
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path.includes("send-verification-otp")) {
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
