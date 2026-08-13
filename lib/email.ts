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

export interface AgendaSummaryItem {
  title: string;
  estimatedDuration?: number;
  presenterName?: string;
}

export interface ParticipantSummaryItem {
  name: string;
  role?: string;
}

/**
 * Send a "Meeting Invite" email notification to a meeting participant.
 */
export async function sendMeetingInviteEmail(params: {
  to: string;
  recipientName: string;
  recipientRole?: string;
  meetingId: string;
  meetingTitle: string;
  meetingType: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  organizerName: string;
  organizerEmail?: string;
  agendaItems?: AgendaSummaryItem[];
  participants?: ParticipantSummaryItem[];
}): Promise<void> {
  const {
    to,
    recipientName,
    recipientRole,
    meetingId,
    meetingTitle,
    meetingType,
    meetingDate,
    startTime,
    endTime,
    timezone,
    location,
    organizerName,
    organizerEmail,
    agendaItems = [],
    participants = [],
  } = params;

  // Skip if SMTP is not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP not configured — skipping email to", to);
    return;
  }

  const transporter = getTransporter();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const joinUrl = `${baseUrl}/meetings/${meetingId}/room`;
  const meetingDetailsUrl = `${baseUrl}/meetings/${meetingId}`;

  const agendaHtml = agendaItems.length > 0
    ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 12px; font-size: 16px; color: #111827; font-weight: 700;">📌 Agenda Overview</h3>
        <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
          ${agendaItems
            .map(
              (item) => `
            <li style="margin-bottom: 8px;">
              <strong>${item.title}</strong>
              ${item.estimatedDuration ? `<span style="color: #6b7280; font-size: 13px;"> (${item.estimatedDuration} mins)</span>` : ""}
              ${item.presenterName ? `<br/><span style="color: #4f46e5; font-size: 13px;">Presenter: ${item.presenterName}</span>` : ""}
            </li>`
            )
            .join("")}
        </ol>
      </div>`
    : "";

  const participantsHtml = participants.length > 0
    ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 12px; font-size: 16px; color: #111827; font-weight: 700;">👥 Invited Members</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
          ${participants
            .map(
              (p) => `
            <li style="margin-bottom: 4px;">
              <strong>${p.name}</strong> ${p.role ? `<span style="color: #6b7280; font-size: 13px;">— ${p.role}</span>` : ""}
            </li>`
            )
            .join("")}
        </ul>
      </div>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 0; color: #334155; }
    .container { max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%); padding: 36px 40px; color: #ffffff; text-align: left; }
    .logo-badge { display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 15px; font-weight: 400; }
    .body { padding: 36px 40px; color: #334155; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .meeting-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid #4f46e5; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
    .meeting-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 14px 0; }
    .detail-row { display: flex; margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
    .detail-label { font-weight: 600; color: #64748b; width: 110px; flex-shrink: 0; }
    .detail-value { color: #0f172a; font-weight: 500; }
    .cta-section { text-align: center; margin: 32px 0 24px 0; padding: 24px; background: #f1f5f9; border-radius: 14px; }
    .btn-join { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; padding: 16px 36px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4); transition: all 0.2s ease; }
    .link-fallback { margin-top: 14px; font-size: 12px; color: #64748b; word-break: break-all; }
    .footer { padding: 24px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; }
    .governance-notice { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin-top: 24px; font-size: 13px; color: #1e40af; line-height: 1.5; text-align: left; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">BoardSync Meeting Invitation</div>
      <h1>📅 ${meetingTitle}</h1>
      <p>You have been invited to a ${meetingType}</p>
    </div>

    <div class="body">
      <div class="greeting">Dear ${recipientName},</div>
      <div class="intro">
        <strong>${organizerName}</strong> has invited you to participate as <strong>${recipientRole || "Participant"}</strong> in the upcoming meeting on BoardSync.
      </div>

      <div class="meeting-card">
        <div class="meeting-title">${meetingTitle}</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #64748b; width: 110px; font-size: 14px;">Date:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${meetingDate}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #64748b; font-size: 14px;">Time:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${startTime} – ${endTime} (${timezone})</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #64748b; font-size: 14px;">Type:</td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 14px;">${meetingType}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #64748b; font-size: 14px;">Organizer:</td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 14px;">${organizerName}${organizerEmail ? ` (${organizerEmail})` : ""}</td>
          </tr>
          ${location ? `
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #64748b; font-size: 14px;">Location:</td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 14px;">${location}</td>
          </tr>` : ""}
        </table>
      </div>

      ${agendaHtml}
      ${participantsHtml}

      <div class="cta-section">
        <a href="${joinUrl}" class="btn-join" target="_blank">🎥 Join Meeting Now</a>
        <div class="link-fallback">
          Direct Join Link: <a href="${joinUrl}" style="color: #4f46e5;">${joinUrl}</a>
        </div>
      </div>

      <div class="governance-notice">
        <strong>🔒 BoardSync Security & Governance Notice:</strong><br/>
        This invitation contains secure details for authorized board members and participants. You can also access meeting documents and RSVP status directly in the <a href="${meetingDetailsUrl}" style="color: #1e40af; font-weight: 600;">BoardSync Portal</a>.
      </div>
    </div>

    <div class="footer">
      <p>This automated invitation was generated by BoardSync Portal for board management efficiency.</p>
      <p>© ${new Date().getFullYear()} BoardSync Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"BoardSync" <${process.env.SMTP_USER}>`,
    to,
    subject: `[BoardSync Invitation] ${meetingTitle} — ${meetingDate}`,
    html,
  });
}

/**
 * Send a welcome email to a new user indicating their registration is pending admin approval.
 */
export async function sendWelcomeEmail(params: {
  to: string;
  userName: string;
}): Promise<void> {
  const { to, userName } = params;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP not configured — skipping welcome email to", to);
    return;
  }

  const transporter = getTransporter();
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
    .status-badge { display: inline-block; background: #fffbeb; border: 1px solid #fef3c7; color: #d97706; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    .footer { padding: 20px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👋 Welcome to BoardSync!</h1>
      <p>Your account registration was successful</p>
    </div>
    <div class="body">
      <p>Dear ${userName},</p>
      <p>Thank you for registering an account with BoardSync. We are excited to have you on board!</p>
      <div class="status-badge">⏳ Pending Administrator Approval</div>
      <p>Please note that your account is currently pending. An administrator needs to review and accept your registration request before you can log in.</p>
      <p>Once your account has been approved, you will receive another email notification confirming that you are ready to log in and start using BoardSync.</p>
      <p>Thank you for your patience.</p>
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
    subject: "[BoardSync] Welcome to BoardSync — Registration Pending Approval",
    html,
  });
}

/**
 * Send an email notifying the user that their account has been approved by the admin.
 */
export async function sendAccountApprovedEmail(params: {
  to: string;
  userName: string;
}): Promise<void> {
  const { to, userName } = params;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP not configured — skipping approval email to", to);
    return;
  }

  const transporter = getTransporter();
  const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 8px 0 0; opacity: 0.85; font-size: 14px; }
    .body { padding: 32px 40px; color: #374151; }
    .body p { margin: 0 0 16px; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0 8px; }
    .footer { padding: 20px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Account Approved!</h1>
      <p>Your BoardSync account is now active</p>
    </div>
    <div class="body">
      <p>Dear ${userName},</p>
      <p>We are pleased to inform you that your registration request has been reviewed and accepted by an administrator.</p>
      <p>Your account is now active, and you are ready to log in and access your BoardSync workspace.</p>
      <center>
        <a href="${loginUrl}" class="btn">Log In to BoardSync</a>
      </center>
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
    subject: "[BoardSync] Account Approved — Ready to Log In",
    html,
  });
}

