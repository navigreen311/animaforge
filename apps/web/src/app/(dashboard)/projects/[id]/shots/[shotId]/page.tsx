'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Badge from '@/components/shared/Badge';

interface SceneGraphFormData {
  subject: string;
  cameraAngle: string;
  cameraMovement: string;
  action: string;
  emotion: string;
  duration: string;
  dialogue: string;
}

const cameraAngles = [
  'Eye Level',
  'Low Angle',
  'High Angle',
  'Bird\'s Eye',
  'Dutch Angle',
  'Over the Shoulder',
  'Close-Up',
  'Extreme Close-Up',
  'Wide Shot',
  'Medium Shot',
];

const cameraMovements = [
  'Static',
  'Pan Left',
  'Pan Right',
  'Tilt Up',
  'Tilt Down',
  'Dolly In',
  'Dolly Out',
  'Tracking',
  'Crane',
  'Handheld',
  'Orbit',
];

export default function ShotEditorPage() {
  const params = useParams<{ id: string; shotId: string }>();

  const [formData, setFormData] = useState<SceneGraphFormData>({
    subject: '',
    cameraAngle: 'Eye Level',
    cameraMovement: 'Static',
    action: '',
    emotion: '',
    duration: '4',
    dialogue: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (field: keyof SceneGraphFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Placeholder for generation logic
    setTimeout(() => setIsGenerating(false), 3000);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Left Panel - Scene Graph Form */}
      <div className="w-[420px] shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-y-auto">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-100">Shot Editor</h2>
            <Badge status={isGenerating ? 'generating' : 'draft'} />
          </div>
          <p className="text-xs text-gray-500">
            Project {params.id} &middot; Shot {params.shotId}
          </p>
        </div>

        <form className="p-5 space-y-5" onSubmit={(e) => e.preventDefault()}>
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1.5">
              Subject
            </label>
            <textarea
              id="subject"
              rows={2}
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Describe the main subject of the shot..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
            />
          </div>

          {/* Camera Angle */}
          <div>
            <label htmlFor="camera-angle" className="block text-sm font-medium text-gray-300 mb-1.5">
              Camera Angle
            </label>
            <select
              id="camera-angle"
              value={formData.cameraAngle}
              onChange={(e) => handleChange('cameraAngle', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            >
              {cameraAngles.map((angle) => (
                <option key={angle} value={angle}>
                  {angle}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Movement */}
          <div>
            <label htmlFor="camera-movement" className="block text-sm font-medium text-gray-300 mb-1.5">
              Camera Movement
            </label>
            <select
              id="camera-movement"
              value={formData.cameraMovement}
              onChange={(e) => handleChange('cameraMovement', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            >
              {cameraMovements.map((movement) => (
                <option key={movement} value={movement}>
                  {movement}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label htmlFor="action" className="block text-sm font-medium text-gray-300 mb-1.5">
              Action
            </label>
            <textarea
              id="action"
              rows={2}
              value={formData.action}
              onChange={(e) => handleChange('action', e.target.value)}
              placeholder="Describe the action taking place..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
            />
          </div>

          {/* Emotion */}
          <div>
            <label htmlFor="emotion" className="block text-sm font-medium text-gray-300 mb-1.5">
              Emotion
            </label>
            <input
              id="emotion"
              type="text"
              value={formData.emotion}
              onChange={(e) => handleChange('emotion', e.target.value)}
              placeholder="e.g., determined, melancholic, joyful"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-1.5">
              Duration (seconds)
            </label>
            <input
              id="duration"
              type="number"
              min="1"
              max="30"
              value={formData.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Dialogue */}
          <div>
            <label htmlFor="dialogue" className="block text-sm font-medium text-gray-300 mb-1.5">
              Dialogue
            </label>
            <textarea
              id="dialogue"
              rows={3}
              value={formData.dialogue}
              onChange={(e) => handleChange('dialogue', e.target.value)}
              placeholder="Enter dialogue for this shot (optional)..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
            />
          </div>
        </form>
      </div>

      {/* Right Panel - Preview & Generate */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Preview area */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center">
          {isGenerating ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-400">Generating shot preview...</p>
            </div>
          ) : (
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-400 mb-1">Preview Area</h3>
              <p className="text-sm text-gray-600">
                Fill out the scene graph and click Generate to preview.
              </p>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !formData.subject.trim()}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Shot
            </>
          )}
        </button>
      </div>
    </div>
  );
}
