import { Resend } from 'resend'

/**
 * Thin wrapper around Resend for transactional classroom invites.
 *
 * Required env vars (see .env.example):
 *   RESEND_API_KEY  - Resend API key
 *   EMAIL_FROM      - verified sender, e.g. "Curia <invites@yourdomain.com>"
 *   APP_URL         - public base URL used to build invite links, e.g. https://curia.app
 *
 * If RESEND_API_KEY is missing, sending throws `email_not_configured` so callers
 * can degrade gracefully (the seat is still created and the key shown on screen).
 */

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('email_not_configured')
    this.name = 'EmailNotConfiguredError'
  }
}

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new EmailNotConfiguredError()
  return new Resend(apiKey)
}

function getFrom(): string {
  // Must be an address on a domain verified in Resend. curio.courses is our
  // verified domain; resend.dev only works for sending to your own account email.
  return process.env.EMAIL_FROM ?? 'Curia <noreply@curio.courses>'
}

export function getAppUrl(): string {
  // Explicit override wins (set APP_URL locally or to force a specific domain).
  const explicit = process.env.APP_URL
  if (explicit) return explicit.replace(/\/$/, '')
  // On Vercel these are injected automatically; prefer the stable production
  // domain (e.g. curia-demo.vercel.app) over the per-deployment URL.
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

export function buildInviteUrl(token: string): string {
  return `${getAppUrl()}/invite/${encodeURIComponent(token)}`
}

export type InviteEmailArgs = {
  to: string
  role: 'STUDENT' | 'ADMIN'
  classroomName: string
  inviteeFirstName?: string | null
  /** The student/admin key the invitee must type in after authenticating. */
  key: string
  token: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderInvite(args: InviteEmailArgs): {
  subject: string
  html: string
  text: string
} {
  const { role, classroomName, inviteeFirstName, key } = args
  const url = buildInviteUrl(args.token)
  const roleLabel = role === 'ADMIN' ? 'instructor' : 'student'
  const greetingName = inviteeFirstName?.trim()
  const greeting = greetingName ? `Hi ${escapeHtml(greetingName)},` : 'Hi,'
  const safeClassroom = escapeHtml(classroomName)
  const safeKey = escapeHtml(key)

  const subject = `You're invited to join ${classroomName} on Luminent`

  const text = [
    greeting,
    '',
    `You've been invited to join "${classroomName}" as a ${roleLabel} on Luminent.`,
    '',
    `1. Open this link: ${url}`,
    `2. Sign in or create your account.`,
    `3. When asked, enter your join key: ${key}`,
    '',
    `Your join key: ${key}`,
    '',
    `Keep this key private — you'll need it to confirm your spot.`,
  ].join('\n')

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a2e;">
    <h2 style="margin: 0 0 16px;">${greeting}</h2>
    <p style="font-size: 15px; line-height: 1.5;">
      You've been invited to join <strong>${safeClassroom}</strong> as a ${roleLabel} on Luminent.
    </p>
    <ol style="font-size: 15px; line-height: 1.7; padding-left: 20px;">
      <li>Open your invite using the button below.</li>
      <li>Sign in or create your account.</li>
      <li>When asked, enter your join key.</li>
    </ol>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${url}" style="background: #0ea5a4; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">
        Accept invite
      </a>
    </p>
    <p style="font-size: 14px; line-height: 1.5;">
      Your join key:
      <strong style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18px; letter-spacing: 2px;">${safeKey}</strong>
    </p>
    <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
      You'll be asked to enter this key after signing in, so keep it private.
      If the button doesn't work, copy this link:<br />
      <a href="${url}" style="color: #0ea5a4; word-break: break-all;">${url}</a>
    </p>
  </div>`

  return { subject, html, text }
}

export async function sendInviteEmail(args: InviteEmailArgs): Promise<void> {
  const resend = getResend()
  const { subject, html, text } = renderInvite(args)
  const result = await resend.emails.send({
    from: getFrom(),
    to: args.to,
    subject,
    html,
    text,
  })
  if (result.error) {
    console.error('[email] Resend send failed:', result.error)
    throw new Error(`email_send_failed: ${result.error.message}`)
  }
}
