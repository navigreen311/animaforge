'use client';

import { useState } from 'react';
import type { Character, ExportFormat } from '@/types';
import TwinUploader from './TwinUploader';

const EXPORT_FORMATS: ExportFormat[] = ['glTF', 'ARKit', 'USD', 'FBX'];

interface CharacterDetailProps {
  character: Character;
  onTwinCreate: (id: string, photos: File[]) => void;
  onExport?: (id: string, format: ExportFormat) => void;
  onClose: () => void;
}

export default function CharacterDetail({
  character,
  onTwinCreate,
  onExport,
  onClose,
}: CharacterDetailProps) {
  const [showTwinUploader, setShowTwinUploader] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{character.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-medium text-white">
              {character.styleMode}
            </span>
            {character.isDigitalTwin && (
              <span className="rounded-full bg-cyan-600/20 px-2.5 py-0.5 text-xs font-medium text-cyan-400 ring-1 ring-cyan-500/30">
                Digital Twin
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Large Avatar / Model Preview Area */}
      <div className="flex h-64 items-center justify-center rounded-xl bg-gray-700">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-20 w-20 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-400">3D Model Preview</p>
          </div>
        )}
      </div>

      {/* Character Properties */}
      <div className="grid grid-cols-2 gap-4">
        {character.voiceProfileId && (
          <PropertyItem label="Voice Profile" value={character.voiceProfileId} />
        )}
        {character.bodyParams?.height && (
          <PropertyItem label="Height" value={character.bodyParams.height} />
        )}
        {character.bodyParams?.build && (
          <PropertyItem label="Build" value={character.bodyParams.build} />
        )}
        {character.hairParams?.style && (
          <PropertyItem label="Hair Style" value={character.hairParams.style} />
        )}
        {character.hairParams?.color && (
          <PropertyItem label="Hair Color" value={character.hairParams.color} />
        )}
      </div>

      {character.wardrobeDescription && (
        <div className="rounded-lg bg-gray-800 p-4">
          <h4 className="mb-1 text-sm font-medium text-gray-400">Wardrobe</h4>
          <p className="text-sm text-gray-200">{character.wardrobeDescription}</p>
        </div>
      )}

      {character.description && (
        <div className="rounded-lg bg-gray-800 p-4">
          <h4 className="mb-1 text-sm font-medium text-gray-400">Description</h4>
          <p className="text-sm text-gray-200">{character.description}</p>
        </div>
      )}

      {/* Digital Twin Section */}
      {!character.isDigitalTwin && !showTwinUploader && (
        <button
          onClick={() => setShowTwinUploader(true)}
          className="w-full rounded-lg border border-cyan-600 bg-cyan-600/10 px-4 py-3 text-sm font-medium text-cyan-400 hover:bg-cyan-600/20"
        >
          Create Digital Twin
        </button>
      )}

      {showTwinUploader && (
        <div className="rounded-xl border border-gray-600 bg-gray-800 p-4">
          <h3 className="mb-3 text-lg font-semibold text-white">Digital Twin Upload</h3>
          <TwinUploader
            onStartReconstruction={(photos) => onTwinCreate(character.id, photos)}
            isProcessing={character.twinReconstructionStatus === 'processing'}
            status={character.twinReconstructionStatus}
          />
        </div>
      )}

      {/* Export Options */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-400">Export Options</h4>
        <div className="flex flex-wrap gap-2">
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format}
              onClick={() => onExport?.(character.id, format)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:border-indigo-500 hover:text-white"
            >
              {format}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-800 p-3">
      <dt className="text-xs font-medium text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-200">{value}</dd>
    </div>
  );
}
