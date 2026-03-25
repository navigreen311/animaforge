'use client';

interface BrandPreviewProps {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    sizes: { label: string; value: number }[];
  };
  logo: {
    url: string;
    placement: 'top-left' | 'center' | 'bottom-right';
    minSize: number;
    opacity: number;
  };
  watermark: {
    enabled: boolean;
    position: string;
    opacity: number;
  };
}

export default function BrandPreview({ colors, typography, logo, watermark }: BrandPreviewProps) {
  const headingSize = typography.sizes.find((s) => s.label === 'H1')?.value ?? 36;
  const bodySize = typography.sizes.find((s) => s.label === 'Body')?.value ?? 16;

  const logoPositionClass =
    logo.placement === 'top-left'
      ? 'top-3 left-3'
      : logo.placement === 'center'
        ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
        : 'bottom-3 right-3';

  const watermarkPositionClass = (() => {
    switch (watermark.position) {
      case 'top-left': return 'top-2 left-2';
      case 'top-right': return 'top-2 right-2';
      case 'bottom-left': return 'bottom-2 left-2';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      default: return 'bottom-2 right-2';
    }
  })();

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Live Brand Preview</p>

      {/* Mock video frame */}
      <div
        className="relative rounded-xl overflow-hidden aspect-video border border-gray-700"
        style={{ backgroundColor: colors.background }}
      >
        {/* Simulated video content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
          {/* Heading */}
          <h2
            className="text-center leading-tight"
            style={{
              fontFamily: typography.headingFont,
              fontSize: `${Math.min(headingSize, 32)}px`,
              color: colors.text,
            }}
          >
            Brand Preview
          </h2>
          {/* Body text */}
          <p
            className="text-center max-w-md"
            style={{
              fontFamily: typography.bodyFont,
              fontSize: `${Math.min(bodySize, 14)}px`,
              color: colors.text,
              opacity: 0.7,
            }}
          >
            This mock frame shows how your brand kit will appear on rendered video output.
          </p>
          {/* Accent bar */}
          <div className="flex gap-2 mt-2">
            <div
              className="h-1.5 w-16 rounded-full"
              style={{ backgroundColor: colors.primary }}
            />
            <div
              className="h-1.5 w-10 rounded-full"
              style={{ backgroundColor: colors.secondary }}
            />
            <div
              className="h-1.5 w-6 rounded-full"
              style={{ backgroundColor: colors.accent }}
            />
          </div>
        </div>

        {/* Logo overlay */}
        {logo.url && (
          <div className={`absolute ${logoPositionClass}`} style={{ opacity: logo.opacity }}>
            <img
              src={logo.url}
              alt="Logo"
              style={{ width: `${Math.min(logo.minSize, 80)}px`, height: 'auto' }}
              className="object-contain"
            />
          </div>
        )}

        {/* Watermark */}
        {watermark.enabled && (
          <div
            className={`absolute ${watermarkPositionClass} pointer-events-none`}
            style={{ opacity: watermark.opacity }}
          >
            <span
              className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: colors.text }}
            >
              WATERMARK
            </span>
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Frame timecode */}
        <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5">
          <span className="text-[10px] font-mono text-gray-300">00:00:03:14</span>
        </div>
      </div>

      {/* Brand summary */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(colors).map(([key, value]) => (
          <div key={key} className="text-center">
            <div
              className="h-8 rounded-lg border border-gray-700 mb-1"
              style={{ backgroundColor: value }}
            />
            <span className="text-[10px] text-gray-500 capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
