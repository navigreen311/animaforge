'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  X,
  ChevronDown,
  Zap,
  Package,
  CreditCard,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════ */

interface Plan {
  name: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  credits: string;
  cta: string;
  ctaStyle: 'primary' | 'secondary';
  highlighted?: boolean;
  features: string[];
}

const plans: Plan[] = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    credits: '50 credits/mo',
    cta: 'Get started',
    ctaStyle: 'secondary',
    features: [
      '5 generations/day',
      '720p export',
      'Community styles',
      'Basic timeline editor',
      '1 project',
    ],
  },
  {
    name: 'Creator',
    monthlyPrice: 29,
    annualPrice: 23,
    credits: '500 credits/mo',
    cta: 'Start free trial',
    ctaStyle: 'secondary',
    features: [
      '100 generations/day',
      '1080p export',
      'Custom styles',
      'Avatar Studio (3 avatars)',
      'Priority rendering',
      '10 projects',
    ],
  },
  {
    name: 'Pro',
    monthlyPrice: 49,
    annualPrice: 39,
    credits: '2,000 credits/mo',
    cta: 'Start free trial',
    ctaStyle: 'primary',
    highlighted: true,
    features: [
      'Unlimited generations',
      '4K export',
      'Style Intelligence',
      'Unlimited avatars',
      'API access',
      'Team collab (5 seats)',
      '50 projects',
    ],
  },
  {
    name: 'Studio',
    monthlyPrice: 99,
    annualPrice: 79,
    credits: '10,000 credits/mo',
    cta: 'Start free trial',
    ctaStyle: 'secondary',
    features: [
      'Everything in Pro',
      '8K export',
      'Dedicated GPU pool',
      'Unlimited seats',
      'SLA & priority support',
      'Custom model training',
      'Unlimited projects',
    ],
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    credits: 'Custom allocation',
    cta: 'Contact sales',
    ctaStyle: 'secondary',
    features: [
      'Everything in Studio',
      'On-premise deployment',
      'SSO / SAML',
      'Dedicated account manager',
      'Custom SLA',
      'Audit logs',
      'Brand Kit',
    ],
  },
];

interface ComparisonRow {
  feature: string;
  free: string | boolean;
  creator: string | boolean;
  pro: string | boolean;
  studio: string | boolean;
  enterprise: string | boolean;
}

const comparisonRows: ComparisonRow[] = [
  { feature: 'Projects', free: '1', creator: '10', pro: '50', studio: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Watermark', free: true, creator: false, pro: false, studio: false, enterprise: false },
  { feature: 'Style library', free: 'Community', creator: 'Custom', pro: 'Full + AI', studio: 'Full + AI', enterprise: 'Full + AI' },
  { feature: 'Avatar studio', free: false, creator: '3 avatars', pro: 'Unlimited', studio: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Team members', free: '1', creator: '1', pro: '5', studio: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'API access', free: false, creator: false, pro: true, studio: true, enterprise: true },
  { feature: 'Brand Kit', free: false, creator: false, pro: false, studio: true, enterprise: true },
  { feature: 'SSO', free: false, creator: false, pro: false, studio: false, enterprise: true },
  { feature: 'SLA', free: false, creator: false, pro: false, studio: '99.9%', enterprise: 'Custom' },
  { feature: 'Priority generation', free: false, creator: true, pro: true, studio: true, enterprise: true },
];

const creditPacks = [
  { amount: 100, price: 10, discount: null },
  { amount: 500, price: 45, discount: 10 },
  { amount: 1000, price: 85, discount: 15 },
];

const faqs = [
  {
    q: 'What are credits and how do they work?',
    a: 'Credits are the currency for AI generation in AnimaForge. Each generation (video clip, avatar, audio track) consumes credits based on complexity and output resolution. Your plan includes a monthly credit allocation, and unused credits roll over for one billing cycle.',
  },
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. You can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to the new features and a prorated credit for the remaining time on your current plan. Downgrades take effect at the end of your current billing period.',
  },
  {
    q: 'Is there a free trial?',
    a: 'All paid plans come with a 14-day free trial. No credit card is required to start. You get full access to the plan features during the trial period.',
  },
  {
    q: 'What happens when I run out of credits?',
    a: 'You can purchase credit packs at any time. You can also keep using the platform for editing and reviewing existing content. Generation features will pause until credits are replenished at the start of your next billing cycle or via a credit pack purchase.',
  },
  {
    q: 'Do you offer discounts for teams or education?',
    a: 'Yes. We offer special pricing for educational institutions (up to 50% off) and volume discounts for teams larger than 20 members. Contact our sales team for a custom quote.',
  },
  {
    q: 'How does the annual billing discount work?',
    a: 'Annual billing saves you 20% compared to monthly billing. You pay for 12 months upfront at the discounted rate. All features and credit allocations remain the same.',
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'You can cancel at any time. Your subscription remains active until the end of the current billing period. We do not offer partial refunds, but you keep full access until the period ends.',
  },
];

/* ══════════════════════════════════════════════════════════
   COMPONENTS
   ══════════════════════════════════════════════════════════ */

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-emerald-400" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-zinc-600" />;
  return <span className="text-sm text-zinc-300">{value}</span>;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-800/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-medium text-zinc-200 sm:text-base">{q}</span>
        <ChevronDown
          className={`ml-4 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-zinc-400">{a}</p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════ */

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="pb-24">
      {/* ── Header ── */}
      <section className="relative overflow-hidden px-6 pb-16 pt-16 text-center sm:pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12),transparent_70%)]" />
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Plans &amp; Pricing
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-400">
          Start free. Scale with credits. No hidden fees.
        </p>

        {/* Billing toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              annual ? 'bg-violet-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                annual ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-zinc-500'}`}>
            Annual{' '}
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              Save 20%
            </span>
          </span>
        </div>
      </section>

      {/* ── Plan Cards ── */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-5 lg:grid-cols-5">
          {plans.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl border p-6 transition-all ${
                  plan.highlighted
                    ? 'border-violet-500 bg-violet-500/5 shadow-lg shadow-violet-500/10'
                    : 'border-zinc-800 bg-zinc-900/50'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-0.5 text-xs font-medium">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mb-1 mt-3">
                  {price !== null ? (
                    <>
                      <span className="text-4xl font-bold">${price}</span>
                      {price > 0 && <span className="text-sm text-zinc-400">/mo</span>}
                    </>
                  ) : (
                    <span className="text-3xl font-bold">Custom</span>
                  )}
                </div>
                <p className="mb-5 text-xs text-zinc-500">{plan.credits}</p>
                <ul className="mb-6 flex flex-1 flex-col gap-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === 'Enterprise' ? '#' : '/onboarding/welcome'}
                  className={`block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                    plan.ctaStyle === 'primary'
                      ? 'bg-violet-600 text-white hover:bg-violet-500'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Feature Comparison ── */}
      <section className="mx-auto mt-24 max-w-6xl px-6">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="mx-auto flex items-center gap-2 text-sm font-medium text-violet-400 transition-colors hover:text-violet-300"
        >
          {showComparison ? 'Hide' : 'Show'} full feature comparison
          <ChevronDown className={`h-4 w-4 transition-transform ${showComparison ? 'rotate-180' : ''}`} />
        </button>

        {showComparison && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="py-3 pr-4 text-left font-medium text-zinc-400">Feature</th>
                  {['Free', 'Creator', 'Pro', 'Studio', 'Enterprise'].map((h) => (
                    <th key={h} className="px-3 py-3 text-center font-medium text-zinc-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-zinc-800/40">
                    <td className="py-3 pr-4 text-zinc-300">{row.feature}</td>
                    <td className="px-3 py-3 text-center"><CellValue value={row.free} /></td>
                    <td className="px-3 py-3 text-center"><CellValue value={row.creator} /></td>
                    <td className="px-3 py-3 text-center"><CellValue value={row.pro} /></td>
                    <td className="px-3 py-3 text-center"><CellValue value={row.studio} /></td>
                    <td className="px-3 py-3 text-center"><CellValue value={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Credit Packs ── */}
      <section className="mx-auto mt-24 max-w-4xl px-6">
        <div className="flex items-center justify-center gap-2 text-violet-400">
          <CreditCard className="h-5 w-5" />
          <p className="text-sm font-medium uppercase tracking-widest">Credit Packs</p>
        </div>
        <h2 className="mt-3 text-center text-3xl font-bold">Need more credits?</h2>
        <p className="mx-auto mt-3 mb-12 max-w-md text-center text-zinc-400">
          Purchase additional credit packs any time. Bulk packs come with volume discounts.
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {creditPacks.map((pack) => (
            <div
              key={pack.amount}
              className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center transition-all hover:border-zinc-700"
            >
              <Package className="mb-3 h-8 w-8 text-violet-400" />
              <h3 className="text-2xl font-bold">{pack.amount.toLocaleString()} credits</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold">${pack.price}</span>
                {pack.discount && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    -{pack.discount}%
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                ${(pack.price / pack.amount).toFixed(2)} per credit
              </p>
              <button className="mt-5 w-full rounded-lg bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700">
                Buy credits
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto mt-24 max-w-3xl px-6">
        <div className="flex items-center justify-center gap-2 text-violet-400">
          <Zap className="h-5 w-5" />
          <p className="text-sm font-medium uppercase tracking-widest">FAQ</p>
        </div>
        <h2 className="mt-3 mb-10 text-center text-3xl font-bold">Frequently asked questions</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6">
          {faqs.map((faq) => (
            <FAQItem key={faq.q} {...faq} />
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="mt-24 text-center">
        <h2 className="text-3xl font-bold">Ready to start creating?</h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-400">
          Join thousands of creators using AnimaForge to bring their stories to life.
        </p>
        <Link
          href="/onboarding/welcome"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-8 py-3.5 font-medium text-white transition-colors hover:bg-violet-500"
        >
          Start for free <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-sm text-zinc-500">No credit card required</p>
      </section>
    </div>
  );
}
