'use client';

interface FeatureHighlightProps {
  title: string;
  description: string;
  screenshotAlt: string;
}

export default function FeatureHighlight({
  title,
  description,
  screenshotAlt,
}: FeatureHighlightProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex h-48 items-center justify-center bg-zinc-800/50">
        <div className="flex flex-col items-center gap-2 text-zinc-500">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
          <span className="text-xs">{screenshotAlt}</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
      </div>
    </div>
  );
}
