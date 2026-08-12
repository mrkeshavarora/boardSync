/**
 * Server-side only: email utility using Nodemailer.
 * NEVER import this file in client-side code.
 */

import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send a "Minutes Published" email notification to a meeting participant.
 */
export async function sendMinutesEmail(params: {
  to: string;
  memberName: string;
  meetingTitle: string;
  meetingDate: string;
  minutesId: string;
  approvedByName: string;
}): Promise<void> {
  const { to, memberName, meetingTitle, meetingDate, minutesId, approvedByName } = params;

  // Skip if SMTP is not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP not configured — skipping email to", to);
    return;
  }

  const transporter = getTransporter();
  const viewUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/minutes/${minutesId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 40px; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 8px 0 0; opacity: 0.85; font-size: 14px; }
    .body { padding: 32px 40px; color: #374151; }
    .body p { margin: 0 0 16px; line-height: 1.6; }
    .info-box { background: #f9fafb; border-left: 4px solid #6366f1; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; }
    .info-box p { margin: 4px 0; font-size: 14px; }
    .info-box strong { color: #111827; }
    .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .footer { padding: 20px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
    .governance-notice { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 13px; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Meeting Minutes Published</h1>
      <p>The official minutes for your meeting are now available</p>
    </div>
    <div class="body">
      <p>Dear ${memberName},</p>
      <p>The official Minutes of Meeting have been reviewed, approved, and published for the following meeting:</p>
      <div class="info-box">
        <p><strong>Meeting:</strong> ${meetingTitle}</p>
        <p><strong>Date:</strong> ${meetingDate}</p>
        <p><strong>Approved by:</strong> ${approvedByName}</p>
      </div>
      <p>You can view the full minutes by clicking the button below:</p>
      <a href="${viewUrl}" class="btn">View Minutes of Meeting</a>
      <div class="governance-notice">
        <strong>📌 Official Record Notice:</strong> These minutes have been formally approved and constitute the official record of the meeting. Please review them carefully and contact the Board Secretary if you have any corrections to propose.
      </div>
    </div>
    <div class="footer">
      <p>This is an automated notification from BoardSync. Please do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} BoardSync — Board Management Portal</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"BoardSync" <${process.env.SMTP_USER}>`,
    to,
    subject: `[BoardSync] Meeting Minutes Published — ${meetingTitle}`,
    html,
  });
}
