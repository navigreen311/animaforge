'use client';

import { useRef, useState } from 'react';

export interface SonicConfig {
  introUrl: string;
  outroUrl: string;
  transitionUrl: string;
}

interface SonicBrandingProps {
  sonic: SonicConfig;
  onChange: (sonic: SonicConfig) => void;
}

type SonicSlot = 'introUrl' | 'outroUrl' | 'transitionUrl';

const SLOTS: { key: SonicSlot; label: string; description: string }[] = [
  { key: 'introUrl', label: 'Intro Sound', description: 'Played at the start of every video' },
  { key: 'outroUrl', label: 'Outro Sound', description: 'Played at the end of every video' },
  { key: 'transitionUrl', label: 'Transition Sound', description: 'Played between scenes or segments' },
];

function AudioSlot({
  label,
  description,
  url,
  onUpload,
  onRemove,
}: {
  label: string;
  description: string;
  url: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      onUpload(objectUrl);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="rounded-xl bg-gray-800/60 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-200">{label}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {url && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {url ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors ${
              playing
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {playing ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="flex-1 h-8 rounded bg-gray-900 flex items-center px-3">
            <div className="flex gap-[2px] items-end h-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full ${playing ? 'bg-violet-500' : 'bg-gray-600'}`}
                  style={{
                    height: `${4 + Math.random() * 12}px`,
                    transition: 'height 150ms',
                  }}
                />
              ))}
            </div>
          </div>
          <audio
            ref={audioRef}
            src={url}
            onEnded={() => setPlaying(false)}
            preload="metadata"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-gray-700 py-4 text-sm text-gray-500 hover:border-gray-600 hover:text-gray-400 transition-colors"
        >
          Click to upload audio file
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export default function SonicBranding({ sonic, onChange }: SonicBrandingProps) {
  const updateSlot = (key: SonicSlot, url: string) => {
    onChange({ ...sonic, [key]: url });
  };

  const removeSlot = (key: SonicSlot) => {
    onChange({ ...sonic, [key]: '' });
  };

  return (
    <div className="space-y-4">
      {SLOTS.map((slot) => (
        <AudioSlot
          key={slot.key}
          label={slot.label}
          description={slot.description}
          url={sonic[slot.key]}
          onUpload={(url) => updateSlot(slot.key, url)}
          onRemove={() => removeSlot(slot.key)}
        />
      ))}
    </div>
  );
}
