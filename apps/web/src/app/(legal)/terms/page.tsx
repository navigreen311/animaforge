import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | AnimaForge",
  description: "AnimaForge Terms of Service",
};

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "description", title: "2. Description of Service" },
  { id: "registration", title: "3. Account Registration" },
  { id: "billing", title: "4. Billing, Credits & Cancellation" },
  { id: "acceptable-use", title: "5. Acceptable Use Policy" },
  { id: "ip", title: "6. Intellectual Property" },
  { id: "privacy", title: "7. Privacy" },
  { id: "marketplace", title: "8. Marketplace Terms" },
  { id: "liability", title: "9. Limitation of Liability" },
  { id: "governing-law", title: "10. Governing Law" },
  { id: "changes", title: "11. Changes to Terms" },
  { id: "contact", title: "12. Contact Information" },
];

const headingStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  marginTop: 48,
  marginBottom: 16,
  color: "var(--text-primary)",
};

const pStyle: React.CSSProperties = {
  marginBottom: 16,
  color: "var(--text-secondary)",
  fontSize: 15,
};

export default function TermsPage() {
  return (
    <article>
      {/* Draft Banner */}
      <div
        style={{
          backgroundColor: "var(--status-generating-bg)",
          border: "1px solid var(--status-generating-border)",
          color: "var(--status-generating-text)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        DRAFT — FOR REVIEW
      </div>

      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 8,
          color: "var(--text-primary)",
        }}
      >
        Terms of Service
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 40 }}>
        Last updated: April 2026
      </p>

      {/* Table of Contents */}
      <nav
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          marginBottom: 48,
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 12,
          }}
        >
          Table of Contents
        </p>
        <ol
          style={{
            listStyleType: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                style={{
                  fontSize: 14,
                  color: "var(--text-brand)",
                  textDecoration: "none",
                }}
              >
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 1. Acceptance of Terms */}
      <h2 id="acceptance" style={headingStyle}>
        1. Acceptance of Terms
      </h2>
      <p style={pStyle}>
        By accessing or using the AnimaForge platform (&quot;Service&quot;), operated by Green Companies LLC, a Nevada limited liability company, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to all of the terms and conditions set forth herein, you must not access or use the Service.
      </p>
      <p style={pStyle}>
        These Terms constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and Green Companies LLC (&quot;AnimaForge,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). Your continued use of the Service following the posting of any changes to these Terms constitutes your acceptance of those changes.
      </p>
      <p style={pStyle}>
        You represent and warrant that you are at least eighteen (18) years of age and have the legal capacity to enter into these Terms. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
      </p>

      {/* 2. Description of Service */}
      <h2 id="description" style={headingStyle}>
        2. Description of Service
      </h2>
      <p style={pStyle}>
        AnimaForge is an AI-powered animation and video production platform that enables users to generate, edit, and publish animated and video content using artificial intelligence models and related creative tools. The Service includes, but is not limited to, AI video generation, avatar creation, style transfer, a timeline editor, rendering infrastructure, and a marketplace for sharing and selling creative assets.
      </p>
      <p style={pStyle}>
        We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
      </p>

      {/* 3. Account Registration */}
      <h2 id="registration" style={headingStyle}>
        3. Account Registration
      </h2>
      <p style={pStyle}>
        To access certain features of the Service, you must register for an account by providing accurate, current, and complete information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify AnimaForge of any unauthorized use of your account.
      </p>
      <p style={pStyle}>
        AnimaForge reserves the right to suspend or terminate any account that we reasonably believe has been compromised, is being used fraudulently, or is in violation of these Terms. We may also require you to verify your identity through additional authentication methods at our discretion.
      </p>

      {/* 4. Billing */}
      <h2 id="billing" style={headingStyle}>
        4. Billing, Credits &amp; Cancellation
      </h2>
      <p style={pStyle}>
        AnimaForge offers both free and paid subscription tiers. Paid subscriptions are billed on a monthly or annual basis, as selected at the time of purchase. All fees are stated in United States dollars and are non-refundable except as expressly provided in this section or required by applicable law.
      </p>
      <p style={pStyle}>
        Certain features of the Service operate on a credit-based system. Credits are consumed when you use AI generation capabilities, rendering services, and other computational resources. Unused credits do not roll over between billing periods unless explicitly stated in your subscription plan. Purchased credit packs are valid for twelve (12) months from the date of purchase.
      </p>
      <p style={pStyle}>
        You may cancel your subscription at any time through your account settings. Upon cancellation, your subscription will remain active until the end of the current billing period. No partial refunds will be issued for unused portions of a billing period. If you believe you have been charged in error, you must contact our support team within thirty (30) days of the charge to request a review.
      </p>

      {/* 5. Acceptable Use Policy */}
      <h2 id="acceptable-use" style={headingStyle}>
        5. Acceptable Use Policy
      </h2>
      <p style={pStyle}>
        You agree not to use the Service to create, upload, distribute, or otherwise make available any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable. Without limiting the foregoing, the following activities are expressly prohibited:
      </p>
      <p style={pStyle}>
        Generating or distributing child sexual abuse material (CSAM) or any content that sexually exploits minors; creating non-consensual intimate imagery or deepfakes of real individuals; producing content intended to harass, bully, or intimidate specific individuals; generating content that promotes terrorism, incites violence, or glorifies acts of violence; creating fraudulent or deceptive content designed to mislead voters or undermine election integrity; using the Service to generate spam, phishing materials, or malware distribution assets; circumventing or attempting to circumvent any content moderation, safety filters, or usage limits imposed by the Service; using the Service in any manner that violates applicable local, state, national, or international law.
      </p>
      <p style={pStyle}>
        Violation of this Acceptable Use Policy may result in immediate suspension or termination of your account, removal of offending content, and, where appropriate, referral to law enforcement authorities. AnimaForge reserves the sole right to determine whether content or conduct violates this policy.
      </p>

      {/* 6. Intellectual Property */}
      <h2 id="ip" style={headingStyle}>
        6. Intellectual Property
      </h2>
      <p style={pStyle}>
        As between you and AnimaForge, you retain all ownership rights in the original content you create using the Service, including AI-generated outputs produced from your prompts and creative direction, subject to the restrictions set forth in these Terms and our AI Content Policy. You grant AnimaForge a non-exclusive, worldwide, royalty-free license to host, store, and display your content solely for the purpose of providing and improving the Service.
      </p>
      <p style={pStyle}>
        AnimaForge and its licensors retain all rights, title, and interest in and to the Service, including all software, algorithms, models, user interface designs, documentation, and any other proprietary technology. Nothing in these Terms grants you any right to use AnimaForge&apos;s trademarks, service marks, trade names, or logos without our prior written consent.
      </p>
      <p style={pStyle}>
        You acknowledge that AI-generated content may not be eligible for copyright protection in all jurisdictions and that the legal status of AI-generated works is subject to evolving law. AnimaForge makes no representations or warranties regarding the copyrightability of any content generated through the Service.
      </p>

      {/* 7. Privacy */}
      <h2 id="privacy" style={headingStyle}>
        7. Privacy
      </h2>
      <p style={pStyle}>
        Your privacy is important to us. Our collection, use, and disclosure of personal information is governed by our{" "}
        <a href="/privacy" style={{ color: "var(--text-brand)", textDecoration: "none" }}>
          Privacy Policy
        </a>
        , which is incorporated into these Terms by reference. By using the Service, you consent to the practices described in our Privacy Policy.
      </p>
      <p style={pStyle}>
        We encourage you to review our Privacy Policy carefully to understand how we collect, use, and protect your information. If you have any questions or concerns about our privacy practices, please contact us using the information provided in our Privacy Policy.
      </p>

      {/* 8. Marketplace Terms */}
      <h2 id="marketplace" style={headingStyle}>
        8. Marketplace Terms
      </h2>
      <p style={pStyle}>
        The AnimaForge Marketplace allows creators to list, sell, and distribute original creative assets, templates, styles, and other digital goods (&quot;Marketplace Items&quot;). By listing a Marketplace Item, you represent and warrant that you have all necessary rights to sell or distribute the item and that it does not infringe upon the intellectual property rights of any third party.
      </p>
      <p style={pStyle}>
        Revenue from Marketplace sales is shared between the creator and AnimaForge on a 70/30 basis, respectively. Creators receive seventy percent (70%) of the net sale price, and AnimaForge retains thirty percent (30%) as a platform fee. Payouts are processed on a monthly basis, subject to a minimum payout threshold of twenty-five United States dollars ($25.00). AnimaForge reserves the right to modify the revenue share structure with thirty (30) days&apos; advance written notice.
      </p>
      <p style={pStyle}>
        AnimaForge may remove any Marketplace Item at its sole discretion if we determine that the item violates these Terms, our Acceptable Use Policy, or applicable law. Creators are responsible for providing accurate descriptions and ensuring that their Marketplace Items function as advertised.
      </p>

      {/* 9. Limitation of Liability */}
      <h2 id="liability" style={headingStyle}>
        9. Limitation of Liability
      </h2>
      <p style={pStyle}>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ANIMAFORGE, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF, OR INABILITY TO ACCESS OR USE, THE SERVICE; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE; (C) ANY CONTENT OBTAINED FROM THE SERVICE; OR (D) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.
      </p>
      <p style={pStyle}>
        IN NO EVENT SHALL ANIMAFORGE&apos;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNTS PAID BY YOU TO ANIMAFORGE DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED UNITED STATES DOLLARS ($100.00). THE LIMITATIONS SET FORTH IN THIS SECTION SHALL APPLY REGARDLESS OF THE FORM OF ACTION, WHETHER BASED IN CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE.
      </p>

      {/* 10. Governing Law */}
      <h2 id="governing-law" style={headingStyle}>
        10. Governing Law
      </h2>
      <p style={pStyle}>
        These Terms shall be governed by and construed in accordance with the laws of the State of Nevada, United States of America, without regard to its conflict of law principles. Any legal action or proceeding arising out of or relating to these Terms or the Service shall be brought exclusively in the federal or state courts located in Clark County, Nevada, and you hereby consent to the personal jurisdiction of such courts.
      </p>
      <p style={pStyle}>
        Any dispute arising out of or relating to these Terms that cannot be resolved through good-faith negotiation shall be resolved by binding arbitration administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules. The arbitration shall take place in Las Vegas, Nevada, and the arbitrator&apos;s decision shall be final and binding. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction.
      </p>

      {/* 11. Changes to Terms */}
      <h2 id="changes" style={headingStyle}>
        11. Changes to Terms
      </h2>
      <p style={pStyle}>
        AnimaForge reserves the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the Service and updating the &quot;Last updated&quot; date at the top of this page. For significant changes, we may also provide additional notice through email or an in-app notification.
      </p>
      <p style={pStyle}>
        Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree with any changes, you must discontinue your use of the Service and close your account. We encourage you to review these Terms periodically for any updates.
      </p>

      {/* 12. Contact Information */}
      <h2 id="contact" style={headingStyle}>
        12. Contact Information
      </h2>
      <p style={pStyle}>
        If you have any questions, concerns, or feedback regarding these Terms of Service, please contact us at:
      </p>
      <p style={pStyle}>
        Green Companies LLC<br />
        Attn: AnimaForge Legal<br />
        Email: legal@animaforge.com
      </p>
    </article>
  );
}
