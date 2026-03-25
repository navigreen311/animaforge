'use client';

import Link from 'next/link';
import PricingCard from '@/components/onboarding/PricingCard';

const features = [
  {
    icon: (
      <svg className="h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: 'AI Video Generation',
    description:
      'Generate cinematic video from text prompts, storyboards, or reference images with state-of-the-art diffusion models.',
  },
  {
    icon: (
      <svg className="h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    title: 'Avatar Studio',
    description:
      'Create photorealistic digital avatars with lip-sync, emotion control, and full-body animation capabilities.',
  },
  {
    icon: (
      <svg className="h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
      </svg>
    ),
    title: 'Style Intelligence',
    description:
      'Transfer, blend, and evolve visual styles across scenes. Maintain consistent aesthetics throughout your project.',
  },
];

const pipelineSteps = [
  'Script', 'Storyboard', 'Assets', 'Rigging', 'Animation',
  'VFX', 'Compositing', 'Audio', 'Grading', 'Review', 'Export',
];

const pricingTiers = [
  {
    name: 'Free',
    price: 0,
    features: ['5 generations / day', '720p export', 'Community styles', 'Basic timeline editor'],
  },
  {
    name: 'Creator',
    price: 29,
    features: ['100 generations / day', '1080p export', 'Custom styles', 'Avatar Studio (3 avatars)', 'Priority rendering'],
  },
  {
    name: 'Pro',
    price: 49,
    highlighted: true,
    features: ['Unlimited generations', '4K export', 'Style Intelligence', 'Unlimited avatars', 'API access', 'Team collab (5 seats)'],
  },
  {
    name: 'Studio',
    price: 99,
    features: ['Everything in Pro', '8K export', 'Dedicated GPU pool', 'Unlimited seats', 'SLA & priority support', 'Custom model training'],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-violet-400">Anima</span>Forge
          </span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Sign In
            </Link>
            <Link href="/onboarding/welcome" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-violet-500">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-24 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12),transparent_70%)]" />
        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          AnimaForge
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          AI Animation &amp; Video Production OS
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/onboarding/welcome" className="rounded-lg bg-violet-600 px-6 py-3 font-medium transition-colors hover:bg-violet-500">
            Get Started Free
          </Link>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Demo
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Everything You Need to Create</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700">
              <div className="mb-4">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold">11-Stage Production Pipeline</h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-zinc-400">
          From script to final export &mdash; every stage orchestrated by AI.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {pipelineSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-400">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-zinc-300">{step}</span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <svg className="h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold">Simple, Transparent Pricing</h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-zinc-400">
          Start free, scale as you grow. No hidden fees.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier) => (
            <PricingCard key={tier.name} {...tier} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="transition-colors hover:text-zinc-300">Docs</a>
            <a href="#" className="transition-colors hover:text-zinc-300">API</a>
            <a href="#" className="transition-colors hover:text-zinc-300">Marketplace</a>
            <a href="#" className="transition-colors hover:text-zinc-300">Enterprise</a>
          </div>
          <p className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} AnimaForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
