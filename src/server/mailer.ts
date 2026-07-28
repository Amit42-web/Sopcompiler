/**
 * Email delivery for team invitations.
 *
 * Uses SMTP via nodemailer when configured, so real invitation emails are sent
 * to the invitee. If SMTP is not configured (no env vars), sending is skipped
 * gracefully and the caller is told it wasn't sent — the invite is still
 * recorded. Configure with either `SMTP_URL` or the discrete `SMTP_HOST`,
 * `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` variables, plus `MAIL_FROM`.
 */

import nodemailer, { type Transporter } from "nodemailer";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL || process.env.SMTP_HOST);
}

let cached: Transporter | null = null;

function transporter(): Transporter {
  if (cached) return cached;
  if (process.env.SMTP_URL) {
    cached = nodemailer.createTransport(process.env.SMTP_URL);
  } else {
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER || process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return cached;
}

interface InviteEmailParams {
  to: string;
  role: string;
  inviteUrl: string;
  workspace?: string;
}

/**
 * Send an invitation email. Returns whether it was actually sent.
 * Never throws — a delivery failure degrades to `{ sent: false }`.
 */
export async function sendInviteEmail(
  params: InviteEmailParams
): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const workspace = params.workspace ?? "RuleForge AI";
  const from =
    process.env.MAIL_FROM ?? "RuleForge AI <no-reply@ruleforge.local>";

  try {
    await transporter().sendMail({
      from,
      to: params.to,
      subject: `You've been invited to ${workspace}`,
      text: `You've been invited to join ${workspace} as ${params.role}.\n\nOpen the app: ${params.inviteUrl}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
          <h2 style="margin:0 0 8px">You're invited to ${workspace}</h2>
          <p style="color:#475569">You've been added as
            <strong>${params.role}</strong>.</p>
          <p>
            <a href="${params.inviteUrl}"
               style="display:inline-block;background:#2563eb;color:#fff;
                      padding:10px 18px;border-radius:8px;text-decoration:none">
              Open RuleForge AI
            </a>
          </p>
          <p style="color:#94a3b8;font-size:12px">
            If you didn't expect this, you can ignore this email.
          </p>
        </div>`,
    });
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "send failed",
    };
  }
}
