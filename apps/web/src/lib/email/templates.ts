// ---------------------------------------------------------------------------
//  AnimaForge – Transactional Email Templates
//  All templates return plain HTML strings with inline CSS (email-safe).
// ---------------------------------------------------------------------------

const BRAND_PURPLE = '#7c3aed';
const BRAND_PURPLE_LIGHT = '#8b5cf6';
const BG_DARK = '#0a0a0f';
const BG_CARD = '#1a1a2e';
const TEXT_PRIMARY = '#e2e8f0';
const TEXT_MUTED = '#94a3b8';
const BORDER_COLOR = '#2d2d4a';

// ---------------------------------------------------------------------------
//  Base layout
// ---------------------------------------------------------------------------

function emailLayout(content: string, unsubscribeUrl = '{{unsubscribe_url}}'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AnimaForge</title>
</head>
<body style="margin:0;padding:0;background:${BG_DARK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT_PRIMARY};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG_DARK};">
<tr><td align="center" style="padding:32px 16px;">
  <!-- Header -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding:24px 0;text-align:center;">
    <span style="font-size:28px;font-weight:700;color:${BRAND_PURPLE};letter-spacing:-0.5px;">&#9670; AnimaForge</span>
  </td></tr>
  </table>
  <!-- Content card -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BG_CARD};border:1px solid ${BORDER_COLOR};border-radius:12px;">
  <tr><td style="padding:32px 40px;">
    ${content}
  </td></tr>
  </table>
  <!-- Footer -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding:24px 0;text-align:center;color:${TEXT_MUTED};font-size:12px;line-height:1.6;">
    <p style="margin:0;">From: AnimaForge &lt;noreply@animaforge.com&gt;</p>
    <p style="margin:8px 0 0;">You received this email because you have an AnimaForge account.</p>
    <p style="margin:8px 0 0;"><a href="${unsubscribeUrl}" style="color:${TEXT_MUTED};text-decoration:underline;">Unsubscribe</a> &middot; <a href="https://animaforge.com/settings/notifications" style="color:${TEXT_MUTED};text-decoration:underline;">Email preferences</a></p>
    <p style="margin:12px 0 0;color:#64748b;">&copy; ${new Date().getFullYear()} AnimaForge. All rights reserved.</p>
  </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background:${BRAND_PURPLE};border-radius:8px;">
  <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
</td></tr>
</table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT_MUTED};">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER_COLOR};margin:24px 0;">`;
}

function badge(text: string): string {
  return `<span style="display:inline-block;padding:4px 12px;background:${BRAND_PURPLE};color:#fff;font-size:12px;font-weight:600;border-radius:999px;">${text}</span>`;
}

// ---------------------------------------------------------------------------
//  1. Welcome Email
// ---------------------------------------------------------------------------

export function welcomeEmail(name: string, credits: number): string {
  return emailLayout(`
    ${heading(`Welcome to AnimaForge, ${name}! 🎬`)}
    ${paragraph(`Your account is ready and we've loaded <strong>${credits} free credits</strong> so you can start creating right away.`)}
    ${paragraph('Here are three ways to jump in:')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:12px 0;">
        ${ctaButton('🎨 Create Your First Project', 'https://animaforge.com/projects/new')}
      </td></tr>
      <tr><td style="padding:0;">
        <a href="https://animaforge.com/characters" style="color:${BRAND_PURPLE_LIGHT};font-size:14px;text-decoration:none;font-weight:500;">→ Build a character</a>
      </td></tr>
      <tr><td style="padding:8px 0;">
        <a href="https://animaforge.com/marketplace" style="color:${BRAND_PURPLE_LIGHT};font-size:14px;text-decoration:none;font-weight:500;">→ Browse the marketplace</a>
      </td></tr>
    </table>
    ${divider()}
    ${paragraph('Need help? Reply to this email or visit our <a href="https://animaforge.com/docs" style="color:' + BRAND_PURPLE_LIGHT + ';text-decoration:none;">docs</a>.')}
  `);
}

// ---------------------------------------------------------------------------
//  2. Render Complete Email
// ---------------------------------------------------------------------------

export interface QualityScores {
  overall: number;
  consistency?: number;
  motion?: number;
}

export function renderCompleteEmail(
  projectName: string,
  shotNumber: number,
  thumbnail: string | undefined,
  qualityScores: QualityScores,
): string {
  const thumbHtml = thumbnail
    ? `<img src="${thumbnail}" alt="Shot ${shotNumber} preview" style="width:100%;border-radius:8px;margin:16px 0;" />`
    : '';

  const scoresHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:8px 16px 8px 0;font-size:13px;color:${TEXT_MUTED};">Overall</td>
        <td style="padding:8px 0;font-size:13px;font-weight:600;color:${TEXT_PRIMARY};">${qualityScores.overall}/100</td>
      </tr>
      ${qualityScores.consistency != null ? `<tr><td style="padding:4px 16px 4px 0;font-size:13px;color:${TEXT_MUTED};">Consistency</td><td style="padding:4px 0;font-size:13px;color:${TEXT_PRIMARY};">${qualityScores.consistency}/100</td></tr>` : ''}
      ${qualityScores.motion != null ? `<tr><td style="padding:4px 16px 4px 0;font-size:13px;color:${TEXT_MUTED};">Motion</td><td style="padding:4px 0;font-size:13px;color:${TEXT_PRIMARY};">${qualityScores.motion}/100</td></tr>` : ''}
    </table>
  `;

  return emailLayout(`
    ${heading('Your shot is ready! ✅')}
    ${paragraph(`<strong>${projectName}</strong> — Shot #${shotNumber} has finished rendering.`)}
    ${thumbHtml}
    ${scoresHtml}
    ${ctaButton('Review & Approve', `https://animaforge.com/projects?shot=${shotNumber}`)}
  `);
}

// ---------------------------------------------------------------------------
//  3. Render Failed Email
// ---------------------------------------------------------------------------

export function renderFailedEmail(
  projectName: string,
  shotNumber: number,
  reason: string,
  creditsRefunded: number,
): string {
  return emailLayout(`
    ${heading('Render failed ⚠️')}
    ${paragraph(`<strong>${projectName}</strong> — Shot #${shotNumber} could not be completed.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="background:#1e1e38;border:1px solid ${BORDER_COLOR};border-radius:8px;margin:16px 0;width:100%;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;font-size:13px;color:${TEXT_MUTED};">Reason</p>
        <p style="margin:0;font-size:14px;color:#f87171;">${reason}</p>
      </td></tr>
    </table>
    ${paragraph(`We've refunded <strong>${creditsRefunded} credits</strong> back to your account.`)}
    ${ctaButton('Retry Shot', `https://animaforge.com/projects?shot=${shotNumber}&retry=1`)}
    ${paragraph('If this keeps happening, <a href="https://animaforge.com/support" style="color:' + BRAND_PURPLE_LIGHT + ';text-decoration:none;">contact support</a>.')}
  `);
}

// ---------------------------------------------------------------------------
//  4. Credits Low Email
// ---------------------------------------------------------------------------

export function creditsLowEmail(
  name: string,
  remaining: number,
  burnRate?: number,
): string {
  const burnInfo = burnRate
    ? `At your current pace (~${burnRate} credits/day), you'll run out in about <strong>${Math.max(1, Math.ceil(remaining / burnRate))} days</strong>.`
    : `You have <strong>${remaining} credits</strong> remaining.`;

  return emailLayout(`
    ${heading('Credits running low ⚡')}
    ${paragraph(`Hey ${name}, heads up — your AnimaForge balance is getting low.`)}
    ${paragraph(burnInfo)}
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:12px;">
          ${ctaButton('Buy Credits', 'https://animaforge.com/billing/credits')}
        </td>
        <td>
          <a href="https://animaforge.com/billing/plans" style="display:inline-block;padding:12px 28px;color:${BRAND_PURPLE_LIGHT};font-size:14px;font-weight:600;text-decoration:none;border:1px solid ${BRAND_PURPLE};border-radius:8px;">Upgrade Plan</a>
        </td>
      </tr>
    </table>
  `);
}

// ---------------------------------------------------------------------------
//  5. Billing Receipt Email
// ---------------------------------------------------------------------------

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function billingReceiptEmail(
  invoiceNumber: string,
  date: string,
  lineItems: LineItem[],
  total: number,
): string {
  const rows = lineItems
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:${TEXT_PRIMARY};border-bottom:1px solid ${BORDER_COLOR};">${item.description}</td>
      <td style="padding:8px 0;font-size:14px;color:${TEXT_MUTED};text-align:center;border-bottom:1px solid ${BORDER_COLOR};">${item.quantity}</td>
      <td style="padding:8px 0;font-size:14px;color:${TEXT_PRIMARY};text-align:right;border-bottom:1px solid ${BORDER_COLOR};">$${item.total.toFixed(2)}</td>
    </tr>`,
    )
    .join('');

  return emailLayout(`
    ${heading('Payment receipt')}
    ${paragraph(`Invoice <strong>#${invoiceNumber}</strong> — ${date}`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:8px 0;font-size:12px;font-weight:600;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${BORDER_COLOR};">Item</td>
        <td style="padding:8px 0;font-size:12px;font-weight:600;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:1px solid ${BORDER_COLOR};">Qty</td>
        <td style="padding:8px 0;font-size:12px;font-weight:600;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid ${BORDER_COLOR};">Amount</td>
      </tr>
      ${rows}
      <tr>
        <td colspan="2" style="padding:12px 0;font-size:15px;font-weight:700;color:${TEXT_PRIMARY};">Total</td>
        <td style="padding:12px 0;font-size:15px;font-weight:700;color:${TEXT_PRIMARY};text-align:right;">$${total.toFixed(2)}</td>
      </tr>
    </table>
    ${paragraph('This receipt is for your records. <a href="https://animaforge.com/billing" style="color:' + BRAND_PURPLE_LIGHT + ';text-decoration:none;">View billing history</a>')}
  `);
}

// ---------------------------------------------------------------------------
//  6. Weekly Digest Email
// ---------------------------------------------------------------------------

export interface WeeklyStats {
  shots: number;
  approved: number;
  credits: number;
}

export function weeklyDigestEmail(
  name: string,
  stats: WeeklyStats,
  topProject?: string,
): string {
  return emailLayout(`
    ${heading(`Your week in review, ${name}`)}
    ${paragraph("Here's what happened on AnimaForge this week:")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="text-align:center;padding:16px;background:#1e1e38;border-radius:8px 0 0 8px;">
          <p style="margin:0;font-size:24px;font-weight:700;color:${BRAND_PURPLE};">${stats.shots}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MUTED};">Shots rendered</p>
        </td>
        <td style="text-align:center;padding:16px;background:#1e1e38;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#34d399;">${stats.approved}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MUTED};">Approved</p>
        </td>
        <td style="text-align:center;padding:16px;background:#1e1e38;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">${stats.credits}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MUTED};">Credits used</p>
        </td>
      </tr>
    </table>
    ${topProject ? paragraph(`Your most active project: <strong>${topProject}</strong>`) : ''}
    ${ctaButton('Open Dashboard', 'https://animaforge.com/dashboard')}
  `);
}

// ---------------------------------------------------------------------------
//  7. Team Invitation Email
// ---------------------------------------------------------------------------

export function teamInvitationEmail(
  inviterName: string,
  workspaceName: string,
  role: string,
  acceptUrl: string,
): string {
  return emailLayout(`
    ${heading("You've been invited!")}
    ${paragraph(`<strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on AnimaForge as a <strong>${role}</strong>.`)}
    ${ctaButton('Accept Invitation', acceptUrl)}
    ${divider()}
    ${paragraph("If you weren't expecting this invitation, you can safely ignore this email.")}
  `);
}

// ---------------------------------------------------------------------------
//  8. Marketplace Sale Email
// ---------------------------------------------------------------------------

export function marketplaceSaleEmail(
  itemName: string,
  creditsEarned: number,
  monthlyTotal: number,
): string {
  return emailLayout(`
    ${heading('You made a sale! 🎉')}
    ${paragraph(`Your marketplace item <strong>${itemName}</strong> was just purchased.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="background:#1e1e38;border:1px solid ${BORDER_COLOR};border-radius:8px;margin:16px 0;width:100%;">
      <tr>
        <td style="padding:16px;text-align:center;border-right:1px solid ${BORDER_COLOR};">
          <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND_PURPLE};">+${creditsEarned}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MUTED};">Credits earned</p>
        </td>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0;font-size:20px;font-weight:700;color:${TEXT_PRIMARY};">${monthlyTotal}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MUTED};">This month</p>
        </td>
      </tr>
    </table>
    ${ctaButton('View Seller Dashboard', 'https://animaforge.com/marketplace/seller')}
  `);
}

// ---------------------------------------------------------------------------
//  9. Milestone Email
// ---------------------------------------------------------------------------

export function milestoneEmail(
  name: string,
  milestone: string,
  tips: string[],
): string {
  const tipsHtml = tips
    .map(
      (tip) =>
        `<li style="padding:4px 0;font-size:14px;color:${TEXT_MUTED};line-height:1.5;">${tip}</li>`,
    )
    .join('');

  return emailLayout(`
    ${heading(`Congratulations, ${name}! 🏆`)}
    ${badge(milestone)}
    ${paragraph('')}
    ${paragraph("You've hit a new milestone on AnimaForge. Keep up the great work!")}
    ${tips.length > 0 ? `<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">Pro tips for your next level:</p><ul style="margin:0 0 16px;padding-left:20px;">${tipsHtml}</ul>` : ''}
    ${ctaButton('Keep Creating', 'https://animaforge.com/dashboard')}
  `);
}
