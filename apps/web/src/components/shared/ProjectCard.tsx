'use client';

import Link from 'next/link';
import Badge, { type BadgeStatus } from './Badge';

interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  phase: BadgeStatus;
  shotCount: number;
  lastUpdated: string;
}

export default function ProjectCard({ id, title, description, phase, shotCount, lastUpdated }: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`} className="group block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-600/50 hover:bg-gray-900/80 transition-all">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-100 group-hover:text-violet-400 transition-colors truncate pr-3">{title}</h3>
        <Badge status={phase} />
      </div>
      <p className="text-sm text-gray-400 line-clamp-2 mb-4">{description}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {shotCount} shot{shotCount !== 1 ? 's' : ''}
        </span>
        <span>Updated {lastUpdated}</span>
      </div>
    </Link>
  );
}
