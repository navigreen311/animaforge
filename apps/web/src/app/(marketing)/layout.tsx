'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ─── Fixed Navbar ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-violet-400">Anima</span>Forge
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <Link href="/#features" className="transition-colors hover:text-white">Features</Link>
            <Link href="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            <a href="#" className="transition-colors hover:text-white">Marketplace</a>
            <a href="#" className="transition-colors hover:text-white">Developers</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              href="/onboarding/welcome"
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-violet-500"
            >
              Start for free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Content offset for fixed nav */}
      <div className="pt-16">{children}</div>
    </div>
  );
}
