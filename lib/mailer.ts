// Email abstraction — console for dev/staging, Azure Communication Services for production.
// Switch is driven by the presence of AZURE_ACS_CONNECTION_STRING in the environment.

// ── Azure Communication Services (production) ────────────────────────────────
// TODO: install @azure/communication-email when switching to ACS.
//
// import { EmailClient } from "@azure/communication-email";
//
// async function acsSend(to: string, subject: string, text: string) {
//   const client = new EmailClient(process.env.AZURE_ACS_CONNECTION_STRING!);
//   await client.beginSend({
//     senderAddress: process.env.AZURE_ACS_SENDER!,
//     content: { subject, plainText: text },
//     recipients: { to: [{ address: to }] },
//   });
// }

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, text: string) {
  if (process.env.AZURE_ACS_CONNECTION_STRING) {
    throw new Error("ACS email is not yet wired up — uncomment acsSend in lib/mailer.ts");
  }

  console.log(`[mailer] To: ${to} | Subject: ${subject}\n${text}`);
}
