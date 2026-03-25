'use client';

import { useAvatarStore } from '@/stores/avatarStore';

interface ExportFormat {
  id: string;
  label: string;
  description: string;
  compatibleApps: string[];
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'gltf',
    label: 'glTF 2.0',
    description: 'Universal 3D format with PBR materials',
    compatibleApps: ['Blender', 'Three.js', 'Babylon.js', 'Unity'],
  },
  {
    id: 'arkit',
    label: 'ARKit Blendshapes',
    description: '52 facial blendshapes for Apple AR',
    compatibleApps: ['ARKit', 'Reality Composer', 'Unreal Engine'],
  },
  {
    id: 'usd',
    label: 'USD / USDZ',
    description: 'Pixar Universal Scene Description',
    compatibleApps: ['Omniverse', 'Houdini', 'Apple Vision Pro'],
  },
  {
    id: 'bvh',
    label: 'BVH Motion',
    description: 'Skeletal motion capture data',
    compatibleApps: ['Blender', 'MotionBuilder', 'Maya'],
  },
  {
    id: 'fbx',
    label: 'FBX',
    description: 'Autodesk interchange format',
    compatibleApps: ['Unreal Engine', 'Unity', 'Maya', 'Cinema 4D'],
  },
  {
    id: 'mp4',
    label: 'MP4 Rendered',
    description: 'Pre-rendered turntable video',
    compatibleApps: ['Any video player', 'Premiere Pro', 'DaVinci'],
  },
];

export default function AvatarExporter() {
  const job = useAvatarStore((s) =>
    s.avatarJobs.find((j) => j.id === s.activeAvatar)
  );

  const isReady = job?.status === 'complete';

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-200">Export Formats</h3>

      <div className="grid grid-cols-1 gap-2">
        {EXPORT_FORMATS.map((fmt) => (
          <div
            key={fmt.id}
            className={`rounded-lg border p-3 transition-colors ${
              isReady
                ? 'border-gray-700 bg-gray-900/60 hover:border-gray-600'
                : 'border-gray-800 bg-gray-900/30 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-200">{fmt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{fmt.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {fmt.compatibleApps.map((app) => (
                    <span
                      key={app}
                      className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-gray-800 text-gray-400 rounded"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={!isReady}
                className="shrink-0 ml-3 px-3 py-1.5 text-xs font-medium rounded-md bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
                  />
                </svg>
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
