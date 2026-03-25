'use client';

import { useState } from 'react';

const MOCK_CHARACTERS = [
  { id: 'char-1', name: 'Maya' },
  { id: 'char-2', name: 'Kai' },
  { id: 'char-3', name: 'Zara' },
  { id: 'char-4', name: 'Leo' },
  { id: 'char-5', name: 'Nova' },
];

interface ScriptInputProps {
  onGenerate: (description: string, characterIds: string[]) => void;
  isGenerating: boolean;
}

export function ScriptInput({ onGenerate, isGenerating }: ScriptInputProps) {
  const [description, setDescription] = useState('');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);

  function toggleCharacter(id: string) {
    setSelectedCharacters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    if (!description.trim()) return;
    onGenerate(description, selectedCharacters);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Scene Description */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="scene-description"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Scene Description
        </label>
        <textarea
          id="scene-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isGenerating}
          placeholder="Describe your scene in detail... e.g., 'A moonlit rooftop conversation between two old friends reuniting after years apart.'"
          rows={8}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-violet-500 disabled:opacity-50"
        />
      </div>

      {/* Character Selector */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Include Characters
        </span>
        <div className="flex flex-wrap gap-2">
          {MOCK_CHARACTERS.map((char) => {
            const isSelected = selectedCharacters.includes(char.id);
            return (
              <label
                key={char.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                  isSelected
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                } ${isGenerating ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCharacter(char.id)}
                  className="sr-only"
                />
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                    isSelected
                      ? 'border-violet-500 bg-violet-500'
                      : 'border-zinc-600 bg-zinc-700'
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {char.name}
              </label>
            );
          })}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleSubmit}
        disabled={isGenerating || !description.trim()}
        className="relative rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            AI is writing
            <span className="inline-flex w-6">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
            </span>
          </span>
        ) : (
          'Generate Script'
        )}
      </button>
    </div>
  );
}
