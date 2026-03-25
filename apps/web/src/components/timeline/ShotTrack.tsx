'use client';

import { useState, useCallback, useRef } from 'react';
import type { Shot, ShotStatus } from './TimelineRoot';

export interface ShotTrackProps {
  shots: Shot[];
  scale: number;
  selectedShotId: string | null;
  selectedShotIds?: string[];
  onSelectShot: (id: string) => void;
  onMultiSelectShot?: (id: string) => void;
  onReorderShots?: (fromIndex: number, toIndex: number) => void;
  onEditShot?: (id: string) => void;
  onDuplicateShot?: (id: string) => void;
  onDeleteShot?: (id: string) => void;
  onGenerateShot?: (id: string) => void;
  onApproveShot?: (id: string) => void;
  onOpenInspector?: (id: string) => void;
}

const STATUS_BG: Record<ShotStatus, string> = { draft: 'bg-zinc-700', pending: 'bg-amber-700', approved: 'bg-emerald-700', rejected: 'bg-red-700', generating: 'bg-violet-700' };
const STATUS_BORDER: Record<ShotStatus, string> = { draft: 'border-zinc-500', pending: 'border-amber-500', approved: 'border-emerald-500', rejected: 'border-red-500', generating: 'border-violet-500' };

interface ContextMenuState { visible: boolean; x: number; y: number; shotId: string; }

export function ShotTrack({ shots, scale, selectedShotId, selectedShotIds = [], onSelectShot, onMultiSelectShot, onReorderShots, onEditShot, onDuplicateShot, onDeleteShot, onGenerateShot, onApproveShot, onOpenInspector }: ShotTrackProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSourceIndex = useRef<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, shotId: '' });
  const allSelected = selectedShotIds.length > 0 ? selectedShotIds : selectedShotId ? [selectedShotId] : [];

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => { dragSourceIndex.current = index; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(index)); }, []);
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIndex(index); }, []);
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, toIndex: number) => { e.preventDefault(); const from = dragSourceIndex.current; setDragOverIndex(null); dragSourceIndex.current = null; if (from !== null && from !== toIndex && onReorderShots) onReorderShots(from, toIndex); }, [onReorderShots]);
  const handleDragEnd = useCallback(() => { setDragOverIndex(null); dragSourceIndex.current = null; }, []);
  const handleClick = useCallback((e: React.MouseEvent, id: string) => { if (e.shiftKey && onMultiSelectShot) onMultiSelectShot(id); else onSelectShot(id); }, [onSelectShot, onMultiSelectShot]);
  const handleDoubleClick = useCallback((id: string) => { onOpenInspector?.(id); }, [onOpenInspector]);
  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, shotId: id }); }, []);
  const closeContextMenu = useCallback(() => { setContextMenu((p) => ({ ...p, visible: false })); }, []);
  const handleContextAction = useCallback((action: string) => { const { shotId } = contextMenu; if (action === 'edit') onEditShot?.(shotId); if (action === 'duplicate') onDuplicateShot?.(shotId); if (action === 'delete') onDeleteShot?.(shotId); if (action === 'generate') onGenerateShot?.(shotId); if (action === 'approve') onApproveShot?.(shotId); closeContextMenu(); }, [contextMenu, onEditShot, onDuplicateShot, onDeleteShot, onGenerateShot, onApproveShot, closeContextMenu]);

  const menuItems = [{ key: 'edit', label: 'Edit' }, { key: 'duplicate', label: 'Duplicate' }, { key: 'delete', label: 'Delete' }, { key: 'generate', label: 'Generate' }, { key: 'approve', label: 'Approve' }];

  return (
    <>
      <div className="pointer-events-auto absolute flex items-stretch" style={{ top: 28, left: 112, height: 80 }} onClick={() => contextMenu.visible && closeContextMenu()}>
        {shots.map((shot, index) => {
          const widthPx = shot.durationSec * scale;
          const isSelected = allSelected.includes(shot.id);
          const isDragTarget = dragOverIndex === index;
          const cls = ['relative flex shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-md border-2 p-1.5 transition-all hover:brightness-110', STATUS_BG[shot.status], isSelected ? 'border-violet-400 ring-2 ring-violet-400/40' : STATUS_BORDER[shot.status], isDragTarget ? 'ring-2 ring-blue-400' : ''].join(' ');
          return (
            <div key={shot.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e, index)} onDrop={(e) => handleDrop(e, index)} onDragEnd={handleDragEnd} onClick={(e) => handleClick(e, shot.id)} onDoubleClick={() => handleDoubleClick(shot.id)} onContextMenu={(e) => handleContextMenu(e, shot.id)} className={cls} style={{ width: widthPx }}>
              <div className="h-8 w-full rounded-sm bg-black/20" />
              <div className="flex items-end justify-between">
                <span className="text-[10px] font-bold text-white/90">#{shot.number}</span>
                <span className="text-[10px] text-white/60">{shot.durationSec}s</span>
              </div>
            </div>
          );
        })}
      </div>
      {contextMenu.visible && (
        <div className="fixed z-50 min-w-[140px] rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-xl" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {menuItems.map((item) => (<button key={item.key} onClick={() => handleContextAction(item.key)} className="flex w-full items-center px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-700">{item.label}</button>))}
        </div>
      )}
      {contextMenu.visible && <div className="fixed inset-0 z-40" onClick={closeContextMenu} />}
    </>
  );
}
