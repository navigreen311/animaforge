'use client';

/**
 * UploadModal (AL-2)
 *
 * Drop-zone + queue modal for uploading assets. Simulates upload progress
 * locally — no backend wiring yet. Integrates with the Asset Library page.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  Upload,
  X,
  File as FileIcon,
  Check,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────
type UploadStatus = 'pending' | 'uploading' | 'done';
type RightsType = 'uploaded' | 'ai-generated' | 'licensed';

interface QueueItem {
  id: string;
  name: string;
  sizeBytes: number;
  progress: number;
  status: UploadStatus;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

// ── Constants ────────────────────────────────────────────────────
const MOCK_FOLDERS = [
  { value: 'characters', label: 'Characters' },
  { value: 'backgrounds', label: 'Backgrounds' },
  { value: 'audio-presets', label: 'Audio Presets' },
];

const RIGHTS_OPTIONS: { value: RightsType; label: string }[] = [
  { value: 'uploaded', label: 'Uploaded (Owned)' },
  { value: 'ai-generated', label: 'AI Generated' },
  { value: 'licensed', label: 'Licensed' },
];

const MAX_SIZE_HINT = 'Up to 500 MB per file';

// ── Helpers ──────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function uid(): string {
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Component ────────────────────────────────────────────────────
export default function UploadModal({ open, onClose }: UploadModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [folder, setFolder] = useState<string>(MOCK_FOLDERS[0].value);
  const [rights, setRights] = useState<RightsType>('uploaded');
  const [uploading, setUploading] = useState(false);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);

  // Reset state whenever the modal opens
  useEffect(() => {
    if (open) {
      setQueue([]);
      setIsDragging(false);
      setUploading(false);
      setFolder(MOCK_FOLDERS[0].value);
      setRights('uploaded');
    }
  }, [open]);

  // Cleanup timers on unmount / close
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearInterval(t));
      timersRef.current = [];
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const id = setTimeout(() => window.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  // ── File intake ───────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const next: QueueItem[] = [];
    Array.from(files).forEach((f) => {
      next.push({
        id: uid(),
        name: f.name,
        sizeBytes: f.size,
        progress: 0,
        status: 'pending',
      });
    });
    if (next.length > 0) {
      setQueue((prev) => [...prev, ...next]);
    }
  }, []);

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      // Reset so selecting the same file again still triggers change
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }, []);

  // ── Mock upload ───────────────────────────────────────────────
  const startUpload = useCallback(() => {
    if (queue.length === 0 || uploading) return;
    setUploading(true);

    // Simulate per-file progress: 0→100 over ~2s (20 ticks @ 100ms)
    let completed = 0;
    const total = queue.filter((q) => q.status !== 'done').length;

    queue.forEach((item, idx) => {
      if (item.status === 'done') return;
      // Mark as uploading
      setTimeout(() => {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q)),
        );

        let tick = 0;
        const interval = setInterval(() => {
          tick += 1;
          const pct = Math.min(100, tick * 5);
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: pct } : q)),
          );
          if (pct >= 100) {
            clearInterval(interval);
            setQueue((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, status: 'done', progress: 100 } : q,
              ),
            );
            completed += 1;
            if (completed >= total) {
              setUploading(false);
              toast.success(
                `Uploaded ${total} file${total !== 1 ? 's' : ''} to ${
                  MOCK_FOLDERS.find((f) => f.value === folder)?.label ?? folder
                }`,
              );
            }
          }
        }, 100);
        timersRef.current.push(interval);
      }, idx * 150); // small stagger so they don't all fire identically
    });
  }, [queue, uploading, folder]);

  if (!open) return null;

  const pendingCount = queue.filter((q) => q.status !== 'done').length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={panelRef}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '0.5px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Upload size={16} style={{ color: 'var(--text-primary)' }} />
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Upload Assets
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            style={{
              border: isDragging
                ? '1.5px dashed var(--brand)'
                : '1.5px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              background: isDragging ? 'var(--brand-dim)' : 'var(--bg-base)',
              padding: '28px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <Upload
              size={28}
              style={{
                color: isDragging ? 'var(--text-brand)' : 'var(--text-tertiary)',
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              Drop files or click to browse
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: 'var(--text-tertiary)',
              }}
            >
              {MAX_SIZE_HINT}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {/* Folder + Rights selectors */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Folder
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    background: 'var(--bg-base)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '7px 28px 7px 10px',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {MOCK_FOLDERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Rights
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={rights}
                  onChange={(e) => setRights(e.target.value as RightsType)}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    background: 'var(--bg-base)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '7px 28px 7px 10px',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {RIGHTS_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Queue ({queue.length})
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {queue.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      background: 'var(--bg-base)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <FileIcon size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text-tertiary)',
                            flexShrink: 0,
                          }}
                        >
                          {formatBytes(item.sizeBytes)}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div
                        style={{
                          marginTop: 5,
                          width: '100%',
                          height: 4,
                          background: 'var(--bg-hover)',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${item.progress}%`,
                            height: '100%',
                            background:
                              item.status === 'done' ? '#22c55e' : 'var(--brand)',
                            transition: 'width 120ms linear',
                          }}
                        />
                      </div>
                    </div>
                    {/* Status */}
                    <div
                      style={{
                        width: 56,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      {item.status === 'pending' && (
                        <>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            Pending
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromQueue(item.id)}
                            aria-label="Remove"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                            }}
                          >
                            <X size={12} style={{ color: 'var(--text-tertiary)' }} />
                          </button>
                        </>
                      )}
                      {item.status === 'uploading' && (
                        <>
                          <Loader2
                            size={12}
                            style={{
                              color: 'var(--text-brand)',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                            {item.progress}%
                          </span>
                        </>
                      )}
                      {item.status === 'done' && (
                        <>
                          <Check size={12} style={{ color: '#22c55e' }} />
                          <span style={{ fontSize: 10, color: '#22c55e' }}>Done</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 20px',
            borderTop: '0.5px solid var(--border)',
            background: 'var(--bg-base)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '0.5px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pendingCount === 0 || uploading}
            onClick={startUpload}
            style={{
              background:
                pendingCount === 0 || uploading ? 'var(--bg-hover)' : 'var(--brand)',
              color:
                pendingCount === 0 || uploading ? 'var(--text-tertiary)' : '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: pendingCount === 0 || uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Upload size={12} />
            {uploading
              ? 'Uploading...'
              : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Inline keyframes for the spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
