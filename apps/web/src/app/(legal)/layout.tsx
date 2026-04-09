import Link from "next/link";

const navLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/ai-policy", label: "AI Policy" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <span style={{ color: "var(--brand-light)" }}>Anima</span>Forge
          </Link>
          <nav style={{ display: "flex", gap: 20 }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "48px 24px 80px",
          lineHeight: 1.8,
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px",
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-tertiary)",
        }}
      >
        &copy; 2026 Green Companies LLC &middot; All rights reserved
      </footer>
    </div>
  );
}
