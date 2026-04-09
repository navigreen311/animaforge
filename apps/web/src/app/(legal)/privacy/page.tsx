import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AnimaForge",
  description: "AnimaForge Privacy Policy — GDPR & CCPA compliant",
};

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

export default function PrivacyPage() {
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
        Privacy Policy
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 40 }}>
        Last updated: April 2026
      </p>

      <p style={pStyle}>
        Green Companies LLC (&quot;AnimaForge,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy describes how we collect, use, disclose, and safeguard your personal information when you use the AnimaForge platform and related services (collectively, the &quot;Service&quot;). This policy is designed to comply with the European Union General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and other applicable data protection laws.
      </p>

      {/* 1. Information We Collect */}
      <h2 id="info-collect" style={headingStyle}>
        1. Information We Collect
      </h2>
      <p style={pStyle}>
        We collect information you provide directly to us when you create an account, subscribe to a plan, use our generation tools, make purchases, participate in the Marketplace, or communicate with us. This includes your name, email address, billing information, payment method details, profile information, and any content or prompts you submit to the Service.
      </p>
      <p style={pStyle}>
        We automatically collect certain technical information when you access or use the Service, including your IP address, browser type and version, operating system, device identifiers, referring URLs, pages viewed, features used, timestamps of interactions, and general geolocation data derived from your IP address. We collect this information through server logs, cookies, and similar tracking technologies.
      </p>
      <p style={pStyle}>
        We may also collect information from third-party sources, such as identity verification providers, payment processors, and publicly available databases, to verify your identity, prevent fraud, and enhance the information we hold about you.
      </p>

      {/* 2. How We Use Your Information */}
      <h2 id="how-use" style={headingStyle}>
        2. How We Use Your Information
      </h2>
      <p style={pStyle}>
        We use the information we collect to provide, maintain, and improve the Service; to process transactions and send related notifications; to personalize your experience and deliver content and features relevant to your interests; to monitor and analyze usage trends and preferences; to detect, investigate, and prevent fraudulent transactions and other illegal activities; and to comply with legal obligations.
      </p>
      <p style={pStyle}>
        We process your personal information on the following legal bases under the GDPR: performance of our contract with you (providing the Service), our legitimate interests (improving the Service, preventing fraud, and ensuring security), your consent (where specifically requested, such as for marketing communications), and compliance with legal obligations.
      </p>

      {/* 3. Data Sharing */}
      <h2 id="data-sharing" style={headingStyle}>
        3. Data Sharing &amp; Third-Party Processors
      </h2>
      <p style={pStyle}>
        We do not sell your personal information to third parties. We share your information only in the limited circumstances described below, and only with service providers who are contractually obligated to protect your data in a manner consistent with this Privacy Policy.
      </p>
      <p style={pStyle}>
        We use the following categories of third-party data processors to operate the Service: Amazon Web Services (AWS) for cloud infrastructure, computing, storage, and content delivery; Stripe for payment processing, subscription management, and fraud detection; Resend for transactional email delivery including account notifications and billing receipts; and Sentry for application error monitoring and performance tracking. Each processor is bound by data processing agreements that require them to handle your data securely and only for the purposes we specify.
      </p>
      <p style={pStyle}>
        We may also disclose your information if required to do so by law, in response to a valid legal process such as a subpoena or court order, to protect the rights, property, or safety of AnimaForge, our users, or the public, or in connection with a merger, acquisition, or sale of all or a portion of our assets.
      </p>

      {/* 4. Data Retention */}
      <h2 id="retention" style={headingStyle}>
        4. Data Retention
      </h2>
      <p style={pStyle}>
        We retain your personal information for as long as your account is active or as needed to provide the Service. If you close your account, we will delete or anonymize your personal information within ninety (90) days, except where we are required to retain it for legal, accounting, or regulatory purposes. Certain aggregated and anonymized data that cannot be used to identify you may be retained indefinitely for analytical and product improvement purposes.
      </p>
      <p style={pStyle}>
        AI-generated content and associated prompts are retained for thirty (30) days after generation to enable you to access and manage your outputs. After this period, content is automatically purged from our active systems. Backup copies may persist for an additional thirty (30) days before being permanently deleted.
      </p>

      {/* 5. Your Rights */}
      <h2 id="your-rights" style={headingStyle}>
        5. Your Rights (GDPR &amp; CCPA)
      </h2>
      <p style={pStyle}>
        If you are a resident of the European Economic Area (EEA) or the United Kingdom, you have the following rights under the GDPR: the right to access your personal data and obtain a copy thereof; the right to rectification of inaccurate or incomplete data; the right to erasure (&quot;right to be forgotten&quot;) of your personal data under certain circumstances; the right to restrict processing of your personal data; the right to data portability, allowing you to receive your data in a structured, commonly used, machine-readable format; the right to object to processing based on our legitimate interests; and the right to withdraw consent at any time where processing is based on consent.
      </p>
      <p style={pStyle}>
        If you are a California resident, you have the following rights under the CCPA: the right to know what personal information we collect, use, disclose, and sell; the right to delete your personal information, subject to certain exceptions; the right to opt-out of the sale of your personal information (we do not sell personal information); and the right to non-discrimination for exercising your privacy rights.
      </p>
      <p style={pStyle}>
        To exercise any of these rights, please contact us at privacy@animaforge.com. We will respond to verified requests within thirty (30) days for GDPR requests and forty-five (45) days for CCPA requests. We may request additional information to verify your identity before fulfilling your request.
      </p>

      {/* 6. Cookies */}
      <h2 id="cookies" style={headingStyle}>
        6. Cookies &amp; Tracking Technologies
      </h2>
      <p style={pStyle}>
        We use cookies and similar tracking technologies to collect and store information about your interactions with the Service. Essential cookies are strictly necessary for the operation of the Service and cannot be disabled. These include session cookies for authentication, security tokens, and load balancing identifiers.
      </p>
      <p style={pStyle}>
        Functional cookies enable enhanced features and personalization, such as remembering your preferences and settings. Analytics cookies help us understand how users interact with the Service so we can improve it. We use privacy-respecting analytics that do not track you across other websites. You can manage your cookie preferences through your browser settings or through the cookie consent banner presented when you first visit the Service.
      </p>

      {/* 7. Children's Privacy */}
      <h2 id="children" style={headingStyle}>
        7. Children&apos;s Privacy
      </h2>
      <p style={pStyle}>
        The Service is not directed to children under the age of thirteen (13), and we do not knowingly collect personal information from children under thirteen. If we become aware that we have collected personal information from a child under thirteen without verification of parental consent, we will take steps to delete that information as quickly as possible.
      </p>
      <p style={pStyle}>
        If you are a parent or guardian and you believe that your child under thirteen has provided us with personal information, please contact us immediately at privacy@animaforge.com so that we can take appropriate action.
      </p>

      {/* 8. International Transfers */}
      <h2 id="international" style={headingStyle}>
        8. International Data Transfers
      </h2>
      <p style={pStyle}>
        AnimaForge is based in the United States, and the information we collect is primarily stored and processed in the United States. If you are located outside the United States, please be aware that your information will be transferred to, stored, and processed in the United States, where data protection laws may differ from those in your jurisdiction.
      </p>
      <p style={pStyle}>
        For transfers of personal data from the EEA or the United Kingdom to the United States, we rely on Standard Contractual Clauses approved by the European Commission, supplemented by additional technical and organizational safeguards where appropriate. We ensure that any third-party processors receiving data outside the EEA are subject to equivalent data protection obligations.
      </p>

      {/* 9. Contact / DPO */}
      <h2 id="contact" style={headingStyle}>
        9. Contact &amp; Data Protection Officer
      </h2>
      <p style={pStyle}>
        If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection Officer at:
      </p>
      <p style={pStyle}>
        Green Companies LLC<br />
        Attn: Data Protection Officer<br />
        Email: privacy@animaforge.com
      </p>
      <p style={pStyle}>
        If you are located in the EEA and believe that our processing of your personal information infringes the GDPR, you have the right to lodge a complaint with your local supervisory authority. We encourage you to contact us first so that we can attempt to resolve your concern directly.
      </p>
    </article>
  );
}
