'use client';

import React, { useState, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NodeKind = 'camera' | 'character' | 'light' | 'prop';

export interface SceneNode {
  id: string;
  name: string;
  kind: NodeKind;
  visible: boolean;
  children: SceneNode[];
}

interface NodeTreeProps {
  nodes: SceneNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (dragId: string, targetId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const ICONS: Record<NodeKind, string> = {
  camera: '\u{1F3A5}',
  character: '\u{1F9CD}',
  light: '\u{1F4A1}',
  prop: '\u{1F4E6}',
};

/* ------------------------------------------------------------------ */
/*  Single tree row                                                    */
/* ------------------------------------------------------------------ */

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  onToggleVisibility,
  onRename,
  onDuplicate,
  onDelete,
  onReorder,
  expandedIds,
  toggleExpand,
}: {
  node: SceneNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
} & Omit<NodeTreeProps, 'nodes'>) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.id);

  const handleContext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const closeMenu = useCallback(() => setCtxMenu(null), []);

  const commitRename = useCallback(() => {
    if (inputRef.current) {
      const val = inputRef.current.value.trim();
      if (val) onRename(node.id, val);
    }
    setEditing(false);
  }, [node.id, onRename]);

  /* drag */
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [node.id],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dragId = e.dataTransfer.getData('text/plain');
      if (dragId && dragId !== node.id) onReorder(dragId, node.id);
    },
    [node.id, onReorder],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <>
      {/* Row */}
      <div
        draggable
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => onSelect(node.id)}
        onContextMenu={handleContext}
        className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded text-sm select-none
          ${selectedId === node.id ? 'bg-purple-600/30 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* expand / collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className="w-4 text-zinc-500 hover:text-zinc-300 flex-shrink-0"
          >
            {expanded ? '\u25BE' : '\u25B8'}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* icon */}
        <span className="flex-shrink-0 text-base">{ICONS[node.kind]}</span>

        {/* name */}
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            defaultValue={node.name}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="bg-zinc-900 border border-zinc-600 rounded px-1 text-xs text-white flex-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1">{node.name}</span>
        )}

        {/* visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(node.id);
          }}
          className={`ml-auto flex-shrink-0 text-xs ${node.visible ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600'}`}
          title={node.visible ? 'Hide' : 'Show'}
        >
          {node.visible ? '\u{1F441}' : '\u25CB'}
        </button>
      </div>

      {/* Children */}
      {hasChildren && expanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggleVisibility={onToggleVisibility}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onReorder={onReorder}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded shadow-lg py-1 text-sm"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseLeave={closeMenu}
        >
          {[
            { label: 'Rename', action: () => { setEditing(true); closeMenu(); } },
            { label: 'Duplicate', action: () => { onDuplicate(node.id); closeMenu(); } },
            { label: 'Delete', action: () => { onDelete(node.id); closeMenu(); }, danger: true },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`block w-full text-left px-4 py-1.5 hover:bg-zinc-800 ${item.danger ? 'text-red-400' : 'text-zinc-300'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  NodeTree                                                           */
/* ------------------------------------------------------------------ */

export function NodeTree(props: NodeTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto py-1">
      {props.nodes.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          selectedId={props.selectedId}
          onSelect={props.onSelect}
          onToggleVisibility={props.onToggleVisibility}
          onRename={props.onRename}
          onDuplicate={props.onDuplicate}
          onDelete={props.onDelete}
          onReorder={props.onReorder}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
}
