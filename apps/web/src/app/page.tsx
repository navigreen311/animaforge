'use client';

import Link from 'next/link';
import {
  Sparkles,
  Palette,
  Users,
  Music,
  Film,
  ShoppingBag,
  Play,
  ArrowRight,
  PenTool,
  Wand2,
  Eye,
  Download,
  Star,
  Github,
  Twitter,
} from 'lucide-react';

/* ── Data ── */

const productFeatures = [
  {
    icon: <Sparkles className="h-7 w-7 text-violet-400" />,
    title: 'Script AI',
    description:
      'Turn any idea into a structured storyboard with intelligent scene breakdowns, dialogue, and camera direction.',
  },
  {
    icon: <Palette className="h-7 w-7 text-cyan-400" />,
    title: 'Style Studio',
    description:
      'Transfer, blend, and evolve visual styles across scenes. Maintain consistent aesthetics throughout your project.',
  },
  {
    icon: <Users className="h-7 w-7 text-pink-400" />,
    title: 'Avatar Studio',
    description:
      'Create photorealistic digital avatars with lip-sync, emotion control, and full-body animation capabilities.',
  },
  {
    icon: <Music className="h-7 w-7 text-amber-400" />,
    title: 'Audio Studio',
    description:
      'Generate voiceovers, sound effects, and adaptive music that sync perfectly with your animation timeline.',
  },
  {
    icon: <Film className="h-7 w-7 text-emerald-400" />,
    title: 'Timeline Editor',
    description:
      'Professional non-linear editor with AI-assisted cuts, transitions, and real-time preview of generated content.',
  },
  {
    icon: <ShoppingBag className="h-7 w-7 text-orange-400" />,
    title: 'Marketplace',
    description:
      'Browse and sell styles, avatars, templates, and plugins. Monetize your creative assets with the community.',
  },
];

const howItWorks = [
  { step: 1, icon: <PenTool className="h-6 w-6" />, label: 'Write', desc: 'Describe your scene or paste a script' },
  { step: 2, icon: <Wand2 className="h-6 w-6" />, label: 'Generate', desc: 'AI creates video, audio & effects' },
  { step: 3, icon: <Eye className="h-6 w-6" />, label: 'Review', desc: 'Refine with the timeline editor' },
  { step: 4, icon: <Download className="h-6 w-6" />, label: 'Export', desc: 'Publish in 4K or share instantly' },
];

const styleShowcase = [
  { name: 'Cyberpunk Neon', gradient: 'from-fuchsia-600 via-violet-600 to-cyan-500' },
  { name: 'Watercolor', gradient: 'from-sky-300 via-rose-200 to-amber-200' },
  { name: 'Anime', gradient: 'from-pink-500 via-red-400 to-yellow-300' },
  { name: 'Film Noir', gradient: 'from-zinc-700 via-zinc-500 to-zinc-900' },
  { name: 'Pixel Retro', gradient: 'from-green-500 via-lime-400 to-emerald-600' },
  { name: 'Oil Painting', gradient: 'from-amber-700 via-orange-500 to-yellow-600' },
];

const pricingPreview = [
  {
    name: 'Free',
    price: 0,
    features: ['5 generations/day', '720p export', 'Community styles'],
  },
  {
    name: 'Pro',
    price: 49,
    highlighted: true,
    features: ['Unlimited generations', '4K export', 'Style Intelligence', 'API access'],
  },
  {
    name: 'Studio',
    price: 99,
    features: ['Everything in Pro', '8K export', 'Unlimited seats', 'SLA & priority support'],
  },
];

const footerLinks = {
  Product: ['Features', 'Pricing', 'Marketplace', 'Changelog'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Terms', 'Privacy', 'AI Policy'],
  Social: ['Twitter', 'GitHub', 'Discord', 'YouTube'],
};

/* ── Page ── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-violet-400">Anima</span>Forge
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <Link href="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            <a href="#styles" className="transition-colors hover:text-white">Styles</a>
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

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-32 text-center sm:pt-40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
        <div className="mx-auto max-w-3xl">
          <span className="mb-6 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
            Now in beta
          </span>
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            The AI animation studio that works like a{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">studio</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            From script to screen in minutes. AnimaForge orchestrates video generation, style transfer, avatars, audio,
            and editing — so you can focus on storytelling.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/onboarding/welcome"
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-8 py-3.5 font-medium transition-colors hover:bg-violet-500"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="flex items-center gap-2 rounded-lg border border-zinc-700 px-8 py-3.5 font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white">
              <Play className="h-4 w-4" />
              Watch demo
            </button>
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            <Star className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-amber-400" />
            Trusted by 2,400+ creators in private beta
          </p>
        </div>
      </section>

      {/* ─── Product Tour / Features ─── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <p className="mb-3 text-center text-sm font-medium uppercase tracking-widest text-violet-400">
          Product Tour
        </p>
        <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">Everything you need to create</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-zinc-400">
          Six integrated AI tools that replace an entire production pipeline.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {productFeatures.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900/70"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800/60">
                {f.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="border-y border-zinc-800/50 bg-zinc-900/20 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-sm font-medium uppercase tracking-widest text-violet-400">
            How It Works
          </p>
          <h2 className="mb-16 text-center text-3xl font-bold sm:text-4xl">Four steps. Zero complexity.</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((s) => (
              <div key={s.label} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600/15 text-violet-400">
                  {s.icon}
                </div>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Step {s.step}
                </span>
                <h3 className="mb-2 text-lg font-semibold">{s.label}</h3>
                <p className="text-sm text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Style Showcase ─── */}
      <section id="styles" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-sm font-medium uppercase tracking-widest text-violet-400">
            Style Library
          </p>
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">Infinite visual styles</h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-zinc-400">
            From cyberpunk to watercolor — pick a style, remix it, or create your own.
          </p>
        </div>
        <div className="relative">
          <div className="no-scrollbar flex gap-5 overflow-x-auto px-6 pb-4">
            {styleShowcase.map((style) => (
              <div
                key={style.name}
                className="flex-none"
              >
                <div
                  className={`h-48 w-72 rounded-xl bg-gradient-to-br ${style.gradient} opacity-80 transition-opacity hover:opacity-100`}
                />
                <p className="mt-3 text-center text-sm font-medium text-zinc-300">{style.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Preview ─── */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <p className="mb-3 text-center text-sm font-medium uppercase tracking-widest text-violet-400">
          Pricing
        </p>
        <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
        <p className="mx-auto mb-14 max-w-lg text-center text-zinc-400">
          Start free, scale as you grow. No hidden fees.
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {pricingPreview.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-xl border p-6 ${
                tier.highlighted
                  ? 'border-violet-500 bg-violet-500/5 shadow-lg shadow-violet-500/10'
                  : 'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-0.5 text-xs font-medium">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mb-5 mt-3">
                <span className="text-4xl font-bold">${tier.price}</span>
                {tier.price > 0 && <span className="text-sm text-zinc-400">/mo</span>}
              </div>
              <ul className="mb-6 flex flex-1 flex-col gap-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-violet-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className={`block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                  tier.highlighted
                    ? 'bg-violet-600 text-white hover:bg-violet-500'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 transition-colors hover:text-violet-300"
          >
            See all plans <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-y border-zinc-800/50 bg-zinc-900/20 px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Start creating today</h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-400">
          Join thousands of creators using AnimaForge to bring their stories to life.
        </p>
        <Link
          href="/onboarding/welcome"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-8 py-3.5 font-medium transition-colors hover:bg-violet-500"
        >
          Start for free <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-sm text-zinc-500">No credit card required</p>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-1">
              <span className="text-lg font-bold tracking-tight">
                <span className="text-violet-400">Anima</span>Forge
              </span>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                AI-powered animation studio for the next generation of storytellers.
              </p>
            </div>
            {/* Links */}
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <h4 className="mb-4 text-sm font-semibold text-zinc-300">{section}</h4>
                <ul className="flex flex-col gap-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/50 pt-8 sm:flex-row">
            <p className="text-sm text-zinc-600">&copy; 2026 Green Companies LLC. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-zinc-500">
              <a href="#" className="transition-colors hover:text-zinc-300">Terms</a>
              <a href="#" className="transition-colors hover:text-zinc-300">Privacy</a>
              <a href="#" className="transition-colors hover:text-zinc-300">AI Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
