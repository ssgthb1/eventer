import { Resend } from 'resend'
import twilio from 'twilio'

const resend = new Resend(process.env.RESEND_API_KEY)

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio credentials not configured')
  return twilio(sid, token)
}

/** Escape HTML special characters to prevent injection in email templates. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface InviteEmailParams {
  to: string
  inviterName: string
  eventName: string
  eventDate: string | null
  acceptUrl: string
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
  const { to, inviterName, eventName, eventDate, acceptUrl } = params

  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', { dateStyle: 'long' })
    : null

  // All user-supplied values are escaped before interpolation
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@eventer.app',
    to,
    subject: `You're invited to ${eventName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin-bottom:8px">
          You're invited! 🎉
        </h1>
        <p style="color:#475569;margin-bottom:4px">
          <strong>${escHtml(inviterName)}</strong> has invited you to
          <strong>${escHtml(eventName)}</strong>.
        </p>
        ${dateStr ? `<p style="color:#64748b;font-size:14px;margin-bottom:24px">${escHtml(dateStr)}</p>` : ''}
        <a href="${escHtml(acceptUrl)}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
          View invitation
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          This invitation expires in 7 days.
        </p>
      </div>
    `,
  })
}

interface InviteSmsParams {
  to: string
  inviterName: string
  eventName: string
  acceptUrl: string
}

export async function sendInviteSms(params: InviteSmsParams): Promise<void> {
  const { to, inviterName, eventName, acceptUrl } = params
  const client = getTwilioClient()

  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
    body: `${inviterName} invited you to "${eventName}" on Eventer. Accept here: ${acceptUrl}`,
  })
}
