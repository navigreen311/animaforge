import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Content Policy | AnimaForge",
  description: "AnimaForge AI Content Policy — responsible AI generation guidelines",
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

export default function AiPolicyPage() {
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
        AI Content Policy
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 40 }}>
        Last updated: April 2026
      </p>

      <p style={pStyle}>
        AnimaForge is committed to the responsible development and deployment of AI-powered creative tools. This AI Content Policy outlines the types of content that may and may not be generated using the Service, our approach to AI transparency, and the processes available to users for reporting violations and appealing content moderation decisions.
      </p>

      {/* 1. Content We Will Generate */}
      <h2 id="will-generate" style={headingStyle}>
        1. Content We Will Generate
      </h2>
      <p style={pStyle}>
        AnimaForge is designed to empower creators to produce a wide range of animated and video content for legitimate creative, commercial, educational, and artistic purposes. We support the generation of original animated characters and scenes, stylized and photorealistic video content, educational and documentary-style visualizations, commercial advertisements and promotional materials, music videos and artistic short films, social media content and digital marketing assets, architectural and product visualization renders, and scientific and medical illustrations and animations.
      </p>
      <p style={pStyle}>
        We encourage the use of our platform for creative expression that pushes artistic boundaries while remaining respectful of individuals and communities. Our AI models are designed to generate high-quality content across a broad spectrum of visual styles, from abstract art to photorealistic rendering.
      </p>

      {/* 2. Content We Will NOT Generate */}
      <h2 id="will-not-generate" style={headingStyle}>
        2. Content We Will NOT Generate
      </h2>
      <p style={pStyle}>
        AnimaForge maintains strict prohibitions against the generation of certain categories of harmful content. These prohibitions are enforced through a combination of automated content filtering, human review, and account-level enforcement actions. The following content is absolutely prohibited:
      </p>
      <p style={pStyle}>
        Child sexual abuse material (CSAM) or any content that depicts, suggests, or facilitates the sexual exploitation of minors. Any attempt to generate such content will result in immediate and permanent account termination, preservation of all relevant evidence, and mandatory reporting to the National Center for Missing and Exploited Children (NCMEC) and applicable law enforcement authorities. There are no warnings, appeals, or second chances for this category of violation.
      </p>
      <p style={pStyle}>
        Non-consensual intimate imagery, including deepfakes or synthetic media that depict real, identifiable individuals in sexual, compromising, or otherwise intimate situations without their explicit consent. This prohibition applies regardless of whether the depicted individual is a public figure or private person.
      </p>
      <p style={pStyle}>
        Realistic depictions of extreme violence, torture, or gore intended to shock, traumatize, or glorify violent acts against real individuals or identifiable groups. Content that promotes, facilitates, or provides instructions for acts of terrorism or mass violence is strictly prohibited.
      </p>
      <p style={pStyle}>
        Election misinformation and voter suppression content, including synthetic media designed to impersonate political candidates, fabricate statements or endorsements attributed to real political figures, suppress voter turnout through deceptive means, or otherwise undermine the integrity of democratic elections in any jurisdiction.
      </p>

      {/* 3. Content Requiring Special Care */}
      <h2 id="special-care" style={headingStyle}>
        3. Content Requiring Special Care
      </h2>
      <p style={pStyle}>
        Certain categories of content are not prohibited outright but require additional review, labeling, or user verification before they can be generated or distributed. These categories include realistic depictions of real public figures in fictional or satirical contexts, content depicting legal but sensitive subjects such as medical procedures or historical atrocities for educational purposes, and content that features weapons, military equipment, or law enforcement scenarios in a non-glorifying context.
      </p>
      <p style={pStyle}>
        For these categories, AnimaForge may apply additional content moderation steps, require users to confirm the intended purpose of the content, apply mandatory AI-generated content labels, or restrict distribution to authenticated and verified accounts. We evaluate content in these categories on a case-by-case basis, taking into account the context, intended audience, and potential for harm.
      </p>

      {/* 4. AI Disclosure */}
      <h2 id="disclosure" style={headingStyle}>
        4. AI Disclosure &amp; Provenance
      </h2>
      <p style={pStyle}>
        AnimaForge is committed to transparency about the AI-generated nature of content produced on our platform. All content generated through the Service is automatically embedded with C2PA (Coalition for Content Provenance and Authenticity) metadata, providing a tamper-evident record of the content&apos;s origin, creation date, and the tools used to produce it.
      </p>
      <p style={pStyle}>
        In addition to C2PA metadata, AnimaForge applies invisible digital watermarks to all AI-generated video and image outputs. These watermarks are imperceptible to the human eye but can be detected by compatible verification tools, enabling downstream platforms, publishers, and consumers to verify whether content was generated using AnimaForge. Deliberately removing, altering, or obscuring these provenance markers constitutes a violation of these Terms.
      </p>
      <p style={pStyle}>
        We believe that clear provenance and disclosure mechanisms are essential for maintaining public trust in AI-generated media. We actively participate in industry-wide efforts to develop and promote AI content labeling standards and will adopt additional disclosure technologies as they become available.
      </p>

      {/* 5. Copyright & Training Data */}
      <h2 id="copyright" style={headingStyle}>
        5. Copyright &amp; Training Data
      </h2>
      <p style={pStyle}>
        AnimaForge&apos;s AI models are trained on a combination of proprietary datasets, licensed content, publicly available data, and synthetic data generated by our research team. We are committed to respecting the intellectual property rights of content creators and have implemented measures to minimize the risk of generating outputs that substantially reproduce copyrighted works.
      </p>
      <p style={pStyle}>
        We maintain an opt-out mechanism for copyright holders who wish to exclude their works from our training datasets. Rights holders may submit opt-out requests through our designated copyright contact, and we will process such requests within a commercially reasonable timeframe. We also honor the robots.txt protocol and other machine-readable opt-out signals for publicly accessible content.
      </p>

      {/* 6. Output Ownership */}
      <h2 id="ownership" style={headingStyle}>
        6. Output Ownership
      </h2>
      <p style={pStyle}>
        Subject to the terms of our Terms of Service, users retain ownership of the creative outputs they generate using the AnimaForge platform. This includes the right to use, modify, distribute, and commercially exploit those outputs. However, users are solely responsible for ensuring that their use of AI-generated outputs complies with applicable copyright, trademark, right of publicity, and other intellectual property laws in their jurisdiction.
      </p>
      <p style={pStyle}>
        AnimaForge does not claim ownership of user-generated outputs. We do retain a limited, non-exclusive license to use anonymized and aggregated data derived from platform usage for the purpose of improving our models and services, as described in our Privacy Policy. We will never use your specific creative outputs to train our models without your explicit opt-in consent.
      </p>

      {/* 7. Appeals Process */}
      <h2 id="appeals" style={headingStyle}>
        7. Appeals Process
      </h2>
      <p style={pStyle}>
        If your content has been flagged, restricted, or removed by our content moderation systems, or if your account has been subject to enforcement action, you have the right to appeal the decision. Appeals may be submitted within thirty (30) days of the moderation action by contacting our Trust and Safety team at abuse@animaforge.com with the subject line &quot;Content Appeal.&quot;
      </p>
      <p style={pStyle}>
        Each appeal is reviewed by a member of our Trust and Safety team who was not involved in the original moderation decision. We aim to resolve all appeals within ten (10) business days. During the appeal process, we will provide you with a clear explanation of the reasons for the original decision and the outcome of the review. If the appeal is upheld, we will restore your content or lift the enforcement action. If the appeal is denied, we will provide a detailed explanation of our reasoning.
      </p>
      <p style={pStyle}>
        Please note that appeals are not available for violations involving child sexual abuse material (CSAM), as described in Section 2. Decisions related to CSAM violations are final and non-appealable.
      </p>

      {/* 8. Reporting Violations */}
      <h2 id="reporting" style={headingStyle}>
        8. Reporting Violations
      </h2>
      <p style={pStyle}>
        If you encounter content on the AnimaForge platform that you believe violates this AI Content Policy, our Terms of Service, or applicable law, we encourage you to report it immediately. Reports can be submitted by emailing abuse@animaforge.com with a description of the content, the URL or identifier of the content if available, and the reason you believe it constitutes a violation.
      </p>
      <p style={pStyle}>
        All reports are treated confidentially. We will acknowledge receipt of your report within forty-eight (48) hours and will investigate the matter promptly. Where appropriate, we will take action in accordance with our enforcement procedures, which may include content removal, account warnings, suspension, or permanent termination depending on the nature and severity of the violation.
      </p>
      <p style={pStyle}>
        AnimaForge is committed to maintaining a safe and responsible platform for all users. We appreciate the vigilance of our community in helping us uphold these standards and will continue to refine our content moderation policies and capabilities as AI technology and the regulatory landscape evolve.
      </p>
    </article>
  );
}
