'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { Character, StyleMode } from '@/types';
import { useCharacters } from '@/hooks/useCharacters';
import CharacterCard from '@/components/characters/CharacterCard';
import CharacterForm from '@/components/characters/CharacterForm';
import CharacterDetail from '@/components/characters/CharacterDetail';

const STYLE_FILTERS: Array<StyleMode | 'all'> = ['all', 'realistic', 'anime', 'cartoon', 'cel', 'pixel'];

export default function CharactersPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const {
    characters,
    activeCharacter,
    isLoading,
    filterByStyleMode,
    create,
    update,
    remove,
    selectCharacter,
    startTwinCreation,
  } = useCharacters(projectId);

  const [styleFilter, setStyleFilter] = useState<StyleMode | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const filteredCharacters = filterByStyleMode(styleFilter);

  const handleCreate = async (data: Partial<Character>) => {
    await create(data);
    setShowCreateModal(false);
  };

  const handleUpdate = async (data: Partial<Character>) => {
    if (!editingCharacter) return;
    await update(editingCharacter.id, data);
    setEditingCharacter(null);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Characters</h1>
          <p className="mt-1 text-sm text-gray-400">
            {characters.length} character{characters.length !== 1 ? 's' : ''} in this project
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Character
        </button>
      </div>

      {/* Style Mode Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STYLE_FILTERS.map((mode) => (
          <button
            key={mode}
            onClick={() => setStyleFilter(mode)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              styleFilter === mode
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            {mode === 'all' ? 'All' : mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && characters.length === 0 && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && characters.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-gray-700 bg-gray-800">
          <svg
            className="mb-3 h-12 w-12 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
            />
          </svg>
          <p className="text-gray-400">No characters yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
          >
            Create your first character
          </button>
        </div>
      )}

      {/* Character Grid */}
      {filteredCharacters.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={(c) => setEditingCharacter(c)}
              onDelete={handleDelete}
              onClick={(id) => selectCharacter(id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-white">Create Character</h2>
            <CharacterForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-white">Edit Character</h2>
            <CharacterForm
              initial={editingCharacter}
              onSubmit={handleUpdate}
              onCancel={() => setEditingCharacter(null)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Character Detail Slide-over */}
      {activeCharacter && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => selectCharacter(null)} />
          <div className="relative w-full max-w-xl overflow-y-auto bg-gray-900 p-6 shadow-2xl">
            <CharacterDetail
              character={activeCharacter}
              onTwinCreate={startTwinCreation}
              onClose={() => selectCharacter(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
