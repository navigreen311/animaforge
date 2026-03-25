'use client';

import { useState, useCallback, useRef } from 'react';
import { useAvatarStore, type StyleMode } from '@/stores/avatarStore';

const STYLE_MODES: { value: StyleMode; label: string }[] = [
  { value: 'realistic', label: 'Realistic' },
  { value: 'anime', label: 'Anime' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'cel', label: 'Cel-Shaded' },
  { value: 'pixel', label: 'Pixel Art' },
];

const GUIDELINES = [
  'Use front-facing photos with neutral expression',
  'Ensure good, even lighting without harsh shadows',
  'Include at least one close-up of the face',
  'Avoid heavy filters or extreme angles',
  'Upload 1\u20133 reference photos for best results',
];

export default function AvatarUploader() {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [styleMode, setStyleMode] = useState<StyleMode>('realistic');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startReconstruction = useAvatarStore((s) => s.startReconstruction);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => {
      const remaining = 3 - prev.length;
      const toAdd = incoming.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      return [...prev, ...toAdd];
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleBeginReconstruction = () => {
    if (photos.length === 0) return;
    const photoUrls = photos.map((p) => p.preview);
    startReconstruction(`char-${Date.now()}`, photoUrls, styleMode);
  };

  return (
    <div className="space-y-6">
      {/* Drag & drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
          isDragOver
            ? 'border-violet-400 bg-violet-500/10'
            : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
        }`}
      >
        <svg
          className="w-10 h-10 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-gray-400">
          <span className="text-violet-400 font-medium">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-600">PNG, JPG up to 10 MB &middot; 1&ndash;3 photos</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Photo preview grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, i) => (
            <div key={photo.preview} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-800">
              <img
                src={photo.preview}
                alt={`Reference ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Style mode selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Style Mode</label>
        <div className="grid grid-cols-5 gap-2">
          {STYLE_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setStyleMode(mode.value)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                styleMode === mode.value
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Begin reconstruction */}
      <button
        type="button"
        onClick={handleBeginReconstruction}
        disabled={photos.length === 0}
        className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-sm transition-colors"
      >
        Begin Reconstruction
      </button>

      {/* Guidelines */}
      <div className="rounded-lg bg-gray-900/60 border border-gray-800 p-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Photo Guidelines
        </h4>
        <ul className="space-y-1.5">
          {GUIDELINES.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
