'use client';

interface PricingCardProps {
  name: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
}

export default function PricingCard({
  name,
  price,
  features,
  highlighted = false,
  ctaLabel = 'Get Started',
}: PricingCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 transition-all ${
        highlighted
          ? 'border-violet-500 bg-violet-500/5 shadow-lg shadow-violet-500/10'
          : 'border-zinc-800 bg-zinc-900/50'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-0.5 text-xs font-medium text-white">
          Popular
        </span>
      )}
      <h3 className="text-lg font-semibold text-white">{name}</h3>
      <div className="mb-5 mt-3">
        <span className="text-4xl font-bold text-white">${price}</span>
        <span className="text-sm text-zinc-400">/mo</span>
      </div>
      <ul className="mb-6 flex flex-1 flex-col gap-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
          highlighted
            ? 'bg-violet-600 text-white hover:bg-violet-500'
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
