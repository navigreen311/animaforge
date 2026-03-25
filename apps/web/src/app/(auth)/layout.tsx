export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-surface p-8 shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}
