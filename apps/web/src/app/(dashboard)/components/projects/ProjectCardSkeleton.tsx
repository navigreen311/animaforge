function ProjectCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
      }}
    >
      {/* Thumbnail */}
      <div
        className="animate-pulse"
        style={{ height: 100, background: "var(--bg-overlay)" }}
      />

      {/* Body */}
      <div style={{ padding: 12 }}>
        {/* Title shimmer */}
        <div
          className="animate-pulse"
          style={{
            height: 16,
            width: "75%",
            background: "var(--bg-overlay)",
            borderRadius: "var(--radius-xl, 4px)",
          }}
        />

        {/* Description line 1 */}
        <div
          className="animate-pulse"
          style={{
            height: 12,
            width: "100%",
            background: "var(--bg-overlay)",
            borderRadius: "var(--radius-xl, 4px)",
            marginTop: 6,
          }}
        />

        {/* Description line 2 */}
        <div
          className="animate-pulse"
          style={{
            height: 12,
            width: "50%",
            background: "var(--bg-overlay)",
            borderRadius: "var(--radius-xl, 4px)",
            marginTop: 4,
          }}
        />

        {/* Progress bar shimmer */}
        <div
          className="animate-pulse"
          style={{
            height: 3,
            width: "100%",
            background: "var(--bg-overlay)",
            borderRadius: "var(--radius-xl, 4px)",
            marginTop: 10,
          }}
        />

        {/* Stats shimmer */}
        <div
          className="animate-pulse"
          style={{
            height: 12,
            width: "66.666%",
            background: "var(--bg-overlay)",
            borderRadius: "var(--radius-xl, 4px)",
            marginTop: 8,
          }}
        />

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          {/* Avatar circles (overlapping) */}
          <div style={{ display: "flex" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--bg-overlay)",
                  marginLeft: i === 0 ? 0 : -6,
                }}
              />
            ))}
          </div>

          {/* Right shimmer */}
          <div
            className="animate-pulse"
            style={{
              height: 12,
              width: 64,
              background: "var(--bg-overlay)",
              borderRadius: "var(--radius-xl, 4px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ProjectCardSkeleton;
