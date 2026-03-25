'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { NodeTree } from './NodeTree';
import type { SceneNode, NodeKind } from './NodeTree';
import { NodeProperties } from './NodeProperties';
import type { NodeData, Vec3, TransformData, CameraProps, CharacterProps, LightProps } from './NodeProperties';
import { SceneViewport } from './SceneViewport';
import { CameraPath } from './CameraPath';
import type { CameraKeyframe } from './CameraPath';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _nextId = 1;
function uid() {
  return `node_${_nextId++}`;
}

function defaultTransform(): TransformData {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

function defaultProps(kind: NodeKind) {
  switch (kind) {
    case 'camera':
      return { camera: { focalLength: 50, angle: 0, movementType: 'static' } as CameraProps };
    case 'character':
      return { character: { expression: 'neutral', pose: 'standing', action: 'idle' } as CharacterProps };
    case 'light':
      return { light: { type: 'key', intensity: 1, color: '#ffffff' } as LightProps };
    default:
      return {};
  }
}

function createNode(kind: NodeKind, name?: string): NodeData & { children: SceneNode[] } {
  const id = uid();
  return {
    id,
    name: name ?? `${kind.charAt(0).toUpperCase() + kind.slice(1)} ${id.split('_')[1]}`,
    kind,
    transform: defaultTransform(),
    children: [],
    visible: true,
    ...defaultProps(kind),
  };
}

/* ------------------------------------------------------------------ */
/*  Flatten / find helpers                                             */
/* ------------------------------------------------------------------ */

type FullNode = NodeData & { children: SceneNode[]; visible: boolean };

function findNode(nodes: FullNode[], id: string): FullNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const child = findNode(n.children as FullNode[], id);
    if (child) return child;
  }
  return undefined;
}

function mapNodes(nodes: FullNode[], id: string, fn: (n: FullNode) => FullNode): FullNode[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n);
    return { ...n, children: mapNodes(n.children as FullNode[], id, fn) };
  });
}

function removeNode(nodes: FullNode[], id: string): FullNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNode(n.children as FullNode[], id) }));
}

function flattenNodes(nodes: FullNode[]): NodeData[] {
  const result: NodeData[] = [];
  for (const n of nodes) {
    result.push(n);
    result.push(...flattenNodes(n.children as FullNode[]));
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Default scene                                                      */
/* ------------------------------------------------------------------ */

const INITIAL_NODES: FullNode[] = [
  { ...createNode('camera', 'Main Camera'), transform: { ...defaultTransform(), position: { x: -3, y: 2, z: 4 } } },
  { ...createNode('character', 'Hero'), transform: { ...defaultTransform(), position: { x: 0, y: 0, z: 0 } } },
  { ...createNode('light', 'Key Light'), transform: { ...defaultTransform(), position: { x: 2, y: 3, z: 2 } } },
  { ...createNode('prop', 'Table'), transform: { ...defaultTransform(), position: { x: 1.5, y: 0, z: -1 } } },
];

const INITIAL_KEYFRAMES: CameraKeyframe[] = [
  { id: 'kf1', time: 0, position: { x: -3, y: 2, z: 4 }, lookAt: { x: 0, y: 0, z: 0 }, focalLength: 50 },
  { id: 'kf2', time: 2, position: { x: 0, y: 2, z: 4 }, lookAt: { x: 0, y: 0, z: 0 }, focalLength: 50 },
  { id: 'kf3', time: 4, position: { x: 2, y: 1, z: 3 }, lookAt: { x: 0, y: 0, z: 0 }, focalLength: 35 },
];

/* ------------------------------------------------------------------ */
/*  SceneGraphEditor                                                   */
/* ------------------------------------------------------------------ */

export function SceneGraphEditor() {
  const [nodes, setNodes] = useState<FullNode[]>(INITIAL_NODES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keyframes] = useState<CameraKeyframe[]>(INITIAL_KEYFRAMES);
  const [selectedKf, setSelectedKf] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => (selectedId ? findNode(nodes, selectedId) ?? null : null),
    [nodes, selectedId],
  );

  const flatNodes = useMemo(() => flattenNodes(nodes), [nodes]);

  /* --- Tree callbacks --- */
  const handleToggleVisibility = useCallback((id: string) => {
    setNodes((prev) => mapNodes(prev, id, (n) => ({ ...n, visible: !n.visible })));
  }, []);

  const handleRename = useCallback((id: string, name: string) => {
    setNodes((prev) => mapNodes(prev, id, (n) => ({ ...n, name })));
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    setNodes((prev) => {
      const source = findNode(prev, id);
      if (!source) return prev;
      const dup: FullNode = {
        ...structuredClone(source),
        id: uid(),
        name: `${source.name} (copy)`,
      };
      return [...prev, dup];
    });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setNodes((prev) => removeNode(prev, id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const handleReorder = useCallback((dragId: string, targetId: string) => {
    setNodes((prev) => {
      const dragged = findNode(prev, dragId);
      if (!dragged) return prev;
      const without = removeNode(prev, dragId);
      // Insert after target at root level for simplicity
      const idx = without.findIndex((n) => n.id === targetId);
      if (idx === -1) return [...without, dragged];
      const next = [...without];
      next.splice(idx + 1, 0, dragged);
      return next;
    });
  }, []);

  /* --- Properties callback --- */
  const handlePropChange = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes((prev) => mapNodes(prev, id, (n) => ({ ...n, ...patch })));
  }, []);

  /* --- Viewport drag callback --- */
  const handleMoveNode = useCallback((id: string, dx: number, dy: number) => {
    setNodes((prev) =>
      mapNodes(prev, id, (n) => ({
        ...n,
        transform: {
          ...n.transform,
          position: {
            x: parseFloat((n.transform.position.x + dx * 0.05).toFixed(2)),
            y: parseFloat((n.transform.position.y + dy * 0.05).toFixed(2)),
            z: n.transform.position.z,
          },
        },
      })),
    );
  }, []);

  /* --- Add node --- */
  const handleAdd = useCallback((kind: NodeKind) => {
    const node = createNode(kind);
    setNodes((prev) => [...prev, node]);
    setSelectedId(node.id);
  }, []);

  /* --- Scene nodes as tree format --- */
  const treeNodes: SceneNode[] = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    kind: n.kind,
    visible: n.visible,
    children: (n.children ?? []) as SceneNode[],
  }));

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/60 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-2">Scene Graph</span>
        {(['camera', 'character', 'light', 'prop'] as NodeKind[]).map((kind) => (
          <button
            key={kind}
            onClick={() => handleAdd(kind)}
            className="px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            + {kind}
          </button>
        ))}
        {selectedId && (
          <button
            onClick={() => handleDelete(selectedId)}
            className="ml-auto px-2.5 py-1 text-xs rounded bg-red-900/40 hover:bg-red-900/70 text-red-400 hover:text-red-300 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel – Node tree */}
        <div className="w-56 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/40 overflow-y-auto">
          <div className="px-2 py-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
            Nodes ({nodes.length})
          </div>
          <NodeTree
            nodes={treeNodes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleVisibility={handleToggleVisibility}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        </div>

        {/* Center – 3D Viewport */}
        <div className="flex-1 relative min-w-0">
          <SceneViewport
            nodes={flatNodes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMoveNode={handleMoveNode}
          />
          {/* Camera path overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <CameraPath
              keyframes={keyframes}
              selectedKeyframeId={selectedKf}
              onSelectKeyframe={setSelectedKf}
              width={800}
              height={600}
            />
          </div>
        </div>

        {/* Right panel – Properties */}
        <div className="w-64 flex-shrink-0 border-l border-zinc-800 bg-zinc-900/40">
          <div className="px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold border-b border-zinc-800">
            Properties
          </div>
          <NodeProperties node={selectedNode} onChange={handlePropChange} />
        </div>
      </div>
    </div>
  );
}
