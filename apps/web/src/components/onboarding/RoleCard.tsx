'use client';

interface RoleCardProps {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export default function RoleCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-200 ${
        selected
          ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10'
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900'
      }`}
    >
      <span className="text-4xl">{icon}</span>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
    </button>
  );
}
