import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? "OnTap Dev Documentation <noreply@example.com>";
const APP_URL =
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const ROLE_LABEL: Record<string, string> = {
  VIEWER: "view only",
  COMMENTER: "comment and suggest",
  EDITOR: "view and edit",
};

// ─── Email Verification ──────────────────────────
export async function sendVerificationEmail(
  to: string,
  name: string,
  pin: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Your OnTap Dev verification PIN",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9f9fb;border-radius:12px;">
        <img src="${APP_URL}/logo.png" alt="Ontap Dev Documentation" style="height:56px;margin-bottom:24px;" />
        <h2 style="color:#1a1a2e;margin:0 0 8px;">Welcome, ${name}!</h2>
        <p style="color:#555;line-height:1.6;">
          Thank you for creating an account on <strong>OnTap Dev Documentation</strong>.
          Use the PIN below to verify your email address.
        </p>
        <div style="margin:28px 0;text-align:center;">
          <div style="display:inline-block;background:#f3f0ff;border:2px dashed #7c3aed;border-radius:12px;padding:20px 36px;">
            <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#7c3aed;font-weight:600;">Your Verification PIN</p>
            <p style="margin:0;font-size:42px;letter-spacing:14px;font-weight:800;color:#1a1a2e;font-family:monospace;">${pin}</p>
          </div>
        </div>
        <p style="color:#555;line-height:1.6;text-align:center;">
          Enter this PIN on the
          <a href="${verifyUrl}" style="color:#7c3aed;font-weight:600;">verification page</a>
          to activate your account.
        </p>
        <p style="color:#888;font-size:13px;text-align:center;margin-top:16px;">
          This PIN expires in 24 hours. If you did not create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// ─── Project Invite ────────────────────────────
export async function sendInviteEmail(
  to: string,
  inviterName: string,
  projectTitle: string,
  role: string,
  token: string
): Promise<void> {
  const inviteUrl = `${APP_URL}/invite/${token}`;
  const permission = ROLE_LABEL[role] ?? role.toLowerCase();

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `${inviterName} invited you to collaborate on "${projectTitle}"`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9f9fb;border-radius:12px;">
        <img src="${APP_URL}/logo.png" alt="OnTap Dev Documentation" style="height:56px;margin-bottom:24px;" />
        <h2 style="color:#1a1a2e;margin:0 0 8px;">You’ve been invited!</h2>
        <p style="color:#555;line-height:1.6;">
          <strong>${inviterName}</strong> has invited you to collaborate on
          <strong>${projectTitle}</strong> with <strong>${permission}</strong> access.
        </p>
        <a href="${inviteUrl}"
          style="display:inline-block;margin:24px 0;padding:14px 32px;background:#7c3aed;color:#fff;
                 border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
          Accept Invitation
        </a>
        <p style="color:#888;font-size:13px;">This invitation expires in 7 days. If you were not expecting this, you can safely ignore it.</p>
      </div>
    `,
  });
}

// ─── Password Reset ──────────────────────────────
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset your OnTap Dev password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9f9fb;border-radius:12px;">
        <img src="${APP_URL}/logo.png" alt="OnTap Dev Documentation" style="height:56px;margin-bottom:24px;" />
        <h2 style="color:#1a1a2e;margin:0 0 8px;">Password Reset Request</h2>
        <p style="color:#555;line-height:1.6;">
          Hi <strong>${name}</strong>, we received a request to reset your password.
        </p>
        <a href="${resetUrl}"
          style="display:inline-block;margin:24px 0;padding:12px 28px;background:#7c3aed;color:#fff;
                 border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
      </div>
    `,
  });
}

// ─── Support Ticket Resolved ──────────────────────
export async function sendSupportResolvedEmail(
  to: string,
  name: string,
  subject: string,
  adminNotes: string,
  ticketId: string
): Promise<void> {
  const ticketUrl = `${APP_URL}/?tab=support#${ticketId}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Your support request "${subject}" has been resolved`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9f9fb;border-radius:12px;">
        <img src="${APP_URL}/logo.png" alt="OnTap Dev Documentation" style="height:56px;margin-bottom:24px;" />
        <h2 style="color:#1a1a2e;margin:0 0 8px;">Your Support Request Has Been Resolved ✅</h2>
        <p style="color:#555;line-height:1.6;">
          Hi <strong>${name}</strong>, great news! Your support request:
        </p>
        <div style="background:#f3f0ff;border-left:4px solid #7c3aed;border-radius:6px;padding:12px 16px;margin:16px 0;">
          <p style="margin:0;font-weight:600;color:#1a1a2e;">${subject}</p>
        </div>
        <p style="color:#555;line-height:1.6;">has been marked as resolved by our support team.</p>
        ${adminNotes ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:1px;">Admin Notes</p>
            <p style="margin:0;color:#166534;line-height:1.6;">${adminNotes}</p>
          </div>
        ` : ""}
        <a href="${ticketUrl}"
          style="display:inline-block;margin:24px 0;padding:12px 28px;background:#7c3aed;color:#fff;
                 border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          View Ticket
        </a>
        <p style="color:#888;font-size:13px;">If you believe this issue hasn't been fully resolved, you can open a new support request.</p>
      </div>
    `,
  });
}

// ─── Two-Factor Authentication OTP ────────────────
export async function sendOtpEmail(
  to: string,
  name: string,
  otp: string
): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Your OnTap Dev verification code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9f9fb;border-radius:12px;">
        <img src="${APP_URL}/logo.png" alt="OnTap Dev Documentation" style="height:56px;margin-bottom:24px;" />
        <h2 style="color:#1a1a2e;margin:0 0 8px;">Verification Code</h2>
        <p style="color:#555;line-height:1.6;">
          Hi <strong>${name}</strong>, use the code below to complete your sign-in.
        </p>
        <div style="margin:28px 0;text-align:center;">
          <div style="display:inline-block;background:#f3f0ff;border:2px dashed #7c3aed;border-radius:12px;padding:20px 36px;">
            <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#7c3aed;font-weight:600;">Your Code</p>
            <p style="margin:0;font-size:42px;letter-spacing:14px;font-weight:800;color:#1a1a2e;font-family:monospace;">${otp}</p>
          </div>
        </div>
        <p style="color:#888;font-size:13px;text-align:center;margin-top:16px;">
          This code expires in 10 minutes. If you did not try to sign in, please secure your account immediately.
        </p>
      </div>
    `,
  });
}
