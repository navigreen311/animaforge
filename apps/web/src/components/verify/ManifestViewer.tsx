'use client';

import { useState } from 'react';

interface ManifestNode {
  label: string;
  value?: string;
  children?: ManifestNode[];
}

interface ManifestViewerProps {
  manifest: ManifestNode[];
}

function ManifestNodeItem({ node, depth = 0 }: { node: ManifestNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={depth > 0 ? 'ml-4 border-l-2 border-gray-200 pl-3' : ''}>
      <div className="flex items-start gap-2 py-1.5">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4.5" />
        )}
        <span className="text-sm font-medium text-gray-700">{node.label}</span>
        {node.value && (
          <span className="text-sm text-gray-500 font-mono">{node.value}</span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child, i) => (
            <ManifestNodeItem key={`${child.label}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManifestViewer({ manifest }: ManifestViewerProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
        C2PA Manifest
      </h3>
      <div className="space-y-0.5">
        {manifest.map((node, i) => (
          <ManifestNodeItem key={`${node.label}-${i}`} node={node} />
        ))}
      </div>
    </div>
  );
}
