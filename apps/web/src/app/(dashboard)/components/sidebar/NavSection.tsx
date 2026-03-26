interface NavSectionProps {
  title: string;
  children: React.ReactNode;
  collapsed?: boolean;
}

export default function NavSection({
  title,
  children,
  collapsed = false,
}: NavSectionProps) {
  return (
    <div role="group" aria-label={title}>
      {!collapsed && (
        <div
          style={{
            padding: "16px 16px 4px",
            fontSize: "9px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-tertiary)",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}
