'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface BreadcrumbSegment {
  label: string;
  href: string;
}

function useBreadcrumbs(): BreadcrumbSegment[] {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segment.replace(/[-_]/g, ' ').replace(/\[.*?\]/, '').replace(/^\w/, (c) => c.toUpperCase());
    return { label, href };
  });
}

export default function TopBar() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 h-16 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-gray-600">/</span>}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-200 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-gray-500 hover:text-gray-300 transition-colors">{crumb.label}</Link>
            )}
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <button type="button" className="relative p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors" aria-label="Notifications">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
        </button>
        <button type="button" className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800 transition-colors" aria-label="User menu">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">U</span>
          </div>
        </button>
      </div>
    </header>
  );
}
