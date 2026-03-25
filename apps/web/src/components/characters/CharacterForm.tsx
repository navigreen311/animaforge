'use client';

import { useState } from 'react';
import type { Character, StyleMode } from '@/types';

const STYLE_MODES: StyleMode[] = ['realistic', 'anime', 'cartoon', 'cel', 'pixel'];

interface CharacterFormProps {
  initial?: Partial<Character>;
  onSubmit: (data: Partial<Character>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CharacterForm({
  initial,
  onSubmit,
  onCancel,
  isLoading = false,
}: CharacterFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [styleMode, setStyleMode] = useState<StyleMode>(initial?.styleMode ?? 'realistic');
  const [isDigitalTwin, setIsDigitalTwin] = useState(initial?.isDigitalTwin ?? false);
  const [voiceProfileId, setVoiceProfileId] = useState(initial?.voiceProfileId ?? '');
  const [height, setHeight] = useState(initial?.bodyParams?.height ?? '');
  const [build, setBuild] = useState(initial?.bodyParams?.build ?? '');
  const [hairStyle, setHairStyle] = useState(initial?.hairParams?.style ?? '');
  const [hairColor, setHairColor] = useState(initial?.hairParams?.color ?? '');
  const [wardrobeDescription, setWardrobeDescription] = useState(
    initial?.wardrobeDescription ?? '',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      styleMode,
      isDigitalTwin,
      voiceProfileId: voiceProfileId || undefined,
      bodyParams: { height: height || undefined, build: build || undefined },
      hairParams: { style: hairStyle || undefined, color: hairColor || undefined },
      wardrobeDescription: wardrobeDescription || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-300">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Character name"
        />
      </div>

      {/* Style Mode */}
      <div>
        <label htmlFor="styleMode" className="mb-1 block text-sm font-medium text-gray-300">
          Style Mode
        </label>
        <select
          id="styleMode"
          value={styleMode}
          onChange={(e) => setStyleMode(e.target.value as StyleMode)}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {STYLE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Digital Twin Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isDigitalTwin}
          onClick={() => setIsDigitalTwin(!isDigitalTwin)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            isDigitalTwin ? 'bg-indigo-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
              isDigitalTwin ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm text-gray-300">Is Digital Twin</span>
      </div>

      {/* Voice ID */}
      <div>
        <label htmlFor="voiceId" className="mb-1 block text-sm font-medium text-gray-300">
          Voice ID
        </label>
        <input
          id="voiceId"
          type="text"
          value={voiceProfileId}
          onChange={(e) => setVoiceProfileId(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Voice profile identifier"
        />
      </div>

      {/* Body Params */}
      <fieldset className="rounded-lg border border-gray-600 p-4">
        <legend className="px-2 text-sm font-medium text-gray-300">Body Parameters</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="height" className="mb-1 block text-sm text-gray-400">
              Height
            </label>
            <input
              id="height"
              type="text"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder='e.g., 5\'10"'
            />
          </div>
          <div>
            <label htmlFor="build" className="mb-1 block text-sm text-gray-400">
              Build
            </label>
            <input
              id="build"
              type="text"
              value={build}
              onChange={(e) => setBuild(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., Athletic"
            />
          </div>
        </div>
      </fieldset>

      {/* Hair Params */}
      <fieldset className="rounded-lg border border-gray-600 p-4">
        <legend className="px-2 text-sm font-medium text-gray-300">Hair Parameters</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="hairStyle" className="mb-1 block text-sm text-gray-400">
              Style
            </label>
            <input
              id="hairStyle"
              type="text"
              value={hairStyle}
              onChange={(e) => setHairStyle(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., Short, wavy"
            />
          </div>
          <div>
            <label htmlFor="hairColor" className="mb-1 block text-sm text-gray-400">
              Color
            </label>
            <input
              id="hairColor"
              type="text"
              value={hairColor}
              onChange={(e) => setHairColor(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g., Dark brown"
            />
          </div>
        </div>
      </fieldset>

      {/* Wardrobe */}
      <div>
        <label htmlFor="wardrobe" className="mb-1 block text-sm font-medium text-gray-300">
          Wardrobe Description
        </label>
        <textarea
          id="wardrobe"
          rows={3}
          value={wardrobeDescription}
          onChange={(e) => setWardrobeDescription(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Describe the character's outfit and wardrobe..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : initial?.id ? 'Update Character' : 'Create Character'}
        </button>
      </div>
    </form>
  );
}
