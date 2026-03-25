export type BadgeStatus = 'draft' | 'generating' | 'review' | 'approved' | 'locked';

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
}

const statusStyles: Record<BadgeStatus, string> = {
  draft: 'bg-gray-700/50 text-gray-300 border-gray-600',
  generating: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  review: 'bg-blue-900/40 text-blue-300 border-blue-700',
  approved: 'bg-green-900/40 text-green-300 border-green-700',
  locked: 'bg-purple-900/40 text-purple-300 border-purple-700',
};

const statusLabels: Record<BadgeStatus, string> = {
  draft: 'Draft',
  generating: 'Generating',
  review: 'Review',
  approved: 'Approved',
  locked: 'Locked',
};

export default function Badge({ status, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]} ${className}`}
    >
      {statusLabels[status]}
    </span>
  );
}
