// ---------------------------------------------------------------------------
//  AnimaForge – Email Send Utility
//  Uses Resend API in production, logs to console in development.
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a transactional email via Resend API.
 * Falls back to console logging when RESEND_API_KEY is not set.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.log('[email] Would send:', params.subject, 'to:', params.to);
    if (process.env.NODE_ENV === 'development') {
      console.log('[email] HTML length:', params.html.length);
    }
    return { success: true, id: 'dev-noop' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AnimaForge <noreply@animaforge.com>',
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[email] Resend API error:', response.status, errorBody);
      return { success: false, error: `Resend API ${response.status}: ${errorBody}` };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[email] Failed to send:', message);
    return { success: false, error: message };
  }
}
