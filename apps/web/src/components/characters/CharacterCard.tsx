'use client';

import type { Character, StyleMode } from '@/types';

const STYLE_COLORS: Record<StyleMode, string> = {
  realistic: 'bg-blue-600',
  anime: 'bg-pink-600',
  cartoon: 'bg-yellow-600',
  cel: 'bg-green-600',
  pixel: 'bg-purple-600',
};

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}

export default function CharacterCard({
  character,
  onEdit,
  onDelete,
  onClick,
}: CharacterCardProps) {
  return (
    <div
      onClick={() => onClick(character.id)}
      className="group relative cursor-pointer rounded-xl border border-gray-700 bg-gray-800 p-4 transition-all hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10"
    >
      {/* Avatar Thumbnail Placeholder */}
      <div className="mb-3 flex h-40 items-center justify-center rounded-lg bg-gray-700">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <svg
            className="h-16 w-16 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        )}
      </div>

      {/* Character Name */}
      <h3 className="mb-2 text-lg font-semibold text-white">{character.name}</h3>

      {/* Badges Row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Style Mode Badge */}
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${STYLE_COLORS[character.styleMode]}`}
        >
          {character.styleMode}
        </span>

        {/* Digital Twin Indicator */}
        {character.isDigitalTwin && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-600/20 px-2.5 py-0.5 text-xs font-medium text-cyan-400 ring-1 ring-cyan-500/30">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 0 1 1 1v1.323l3.954 1.582 1.599-.8a1 1 0 0 1 .894 1.79l-1.233.616 1.738 5.42a1 1 0 0 1-.285 1.05A3.989 3.989 0 0 1 15 15a3.989 3.989 0 0 1-2.667-1.019 1 1 0 0 1-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 0 1-.285 1.05A3.989 3.989 0 0 1 5 15a3.989 3.989 0 0 1-2.667-1.019 1 1 0 0 1-.285-1.05l1.738-5.42-1.233-.617a1 1 0 0 1 .894-1.789l1.599.799L9 4.323V3a1 1 0 0 1 1-1Z" />
            </svg>
            Digital Twin
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(character);
          }}
          className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600 hover:text-white"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(character.id);
          }}
          className="rounded-lg bg-red-900/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
