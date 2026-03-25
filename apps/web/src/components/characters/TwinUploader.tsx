'use client';

import { useCallback, useState } from 'react';

interface TwinUploaderProps {
  onStartReconstruction: (photos: File[]) => void;
  isProcessing?: boolean;
  status?: 'idle' | 'processing' | 'complete' | 'failed';
}

export default function TwinUploader({
  onStartReconstruction,
  isProcessing = false,
  status = 'idle',
}: TwinUploaderProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newFiles = Array.from(files).slice(0, 3 - photos.length);
      if (newFiles.length === 0) return;

      const updated = [...photos, ...newFiles].slice(0, 3);
      setPhotos(updated);

      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => [...prev, ...newPreviews].slice(0, 3));
    },
    [photos],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const progressLabel: Record<string, string> = {
    idle: '',
    processing: 'X5 Pipeline: Reconstructing digital twin...',
    complete: 'Digital twin created successfully!',
    failed: 'Reconstruction failed. Please try again.',
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
        } ${photos.length >= 3 ? 'pointer-events-none opacity-50' : ''}`}
        onClick={() => {
          if (photos.length < 3) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) addFiles(files);
            };
            input.click();
          }
        }}
      >
        <svg
          className="mb-2 h-10 w-10 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm text-gray-400">
          Drop 1-3 reference photos here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {photos.length}/3 photos selected
        </p>
      </div>

      {/* Photo Preview Thumbnails */}
      {previews.length > 0 && (
        <div className="flex gap-3">
          {previews.map((src, i) => (
            <div key={i} className="group relative">
              <img
                src={src}
                alt={`Reference photo ${i + 1}`}
                className="h-24 w-24 rounded-lg object-cover ring-1 ring-gray-600"
              />
              <button
                onClick={() => removePhoto(i)}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Progress Indicator */}
      {status !== 'idle' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {status === 'processing' && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            )}
            {status === 'complete' && (
              <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {status === 'failed' && (
              <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span
              className={`text-sm ${
                status === 'complete'
                  ? 'text-green-400'
                  : status === 'failed'
                    ? 'text-red-400'
                    : 'text-gray-300'
              }`}
            >
              {progressLabel[status]}
            </span>
          </div>
          {status === 'processing' && (
            <div className="h-2 overflow-hidden rounded-full bg-gray-700">
              <div className="h-full animate-pulse rounded-full bg-indigo-500" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      )}

      {/* Start Reconstruction Button */}
      <button
        onClick={() => onStartReconstruction(photos)}
        disabled={photos.length === 0 || isProcessing}
        className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? 'Reconstructing...' : 'Start Reconstruction'}
      </button>
    </div>
  );
}
