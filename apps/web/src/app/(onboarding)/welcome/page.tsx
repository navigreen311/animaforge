'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleCard from '@/components/onboarding/RoleCard';

const roles = [
  {
    id: 'indie',
    icon: '\u{1F3AC}',
    title: 'Indie Creator',
    description:
      'Solo filmmaker, YouTuber, or content creator looking to produce professional-quality video with AI.',
  },
  {
    id: 'professional',
    icon: '\u{1F4BC}',
    title: 'Professional',
    description:
      'Motion designer, editor, or animator integrating AI into an existing creative workflow.',
  },
  {
    id: 'studio',
    icon: '\u{1F3A5}',
    title: 'Studio / Team',
    description:
      'Production team collaborating on projects with shared assets, reviews, and render pipelines.',
  },
  {
    id: 'enterprise',
    icon: '\u{1F3E2}',
    title: 'Enterprise',
    description:
      'Large organization needing custom models, SSO, compliance, and dedicated infrastructure.',
  },
];

export default function WelcomePage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="w-full text-center">
      <h1 className="mb-2 text-3xl font-bold">Welcome to AnimaForge</h1>
      <p className="mb-10 text-zinc-400">
        Tell us about yourself so we can tailor your experience.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            icon={role.icon}
            title={role.title}
            description={role.description}
            selected={selectedRole === role.id}
            onClick={() => setSelectedRole(role.id)}
          />
        ))}
      </div>

      <button
        disabled={!selectedRole}
        onClick={() => router.push('/onboarding/setup')}
        className="mt-10 rounded-lg bg-violet-600 px-8 py-3 font-medium transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
