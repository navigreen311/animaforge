'use client';

import React, { useState, useCallback, useRef } from 'react';
import type { NodeData } from './NodeProperties';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SceneViewportProps {
  nodes: NodeData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveNode: (id: string, dx: number, dy: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Color mapping                                                      */
/* ------------------------------------------------------------------ */

const KIND_COLORS: Record<string, string> = {
  camera: '#60a5fa',   // blue
  character: '#a78bfa', // purple
  light: '#fbbf24',    // amber
  prop: '#34d399',     // green
};

const KIND_SHAPES: Record<string, { width: number; height: number; depth: number }> = {
  camera: { width: 30, height: 20, depth: 20 },
  character: { width: 24, height: 48, depth: 24 },
  light: { width: 16, height: 16, depth: 16 },
  prop: { width: 32, height: 32, depth: 32 },
};

/* ------------------------------------------------------------------ */
/*  SceneViewport                                                      */
/* ------------------------------------------------------------------ */

export function SceneViewport({ nodes, selectedId, onSelect, onMoveNode }: SceneViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [orbit, setOrbit] = useState({ rotX: -25, rotY: 35 });
  const [draggingOrbit, setDraggingOrbit] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  /* --- Drag node --- */
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      onSelect(id);
      setDraggingNode(id);
      lastMouse.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onSelect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingNode) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        onMoveNode(draggingNode, dx * 0.5, dy * -0.5);
        return;
      }
      if (!draggingOrbit) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setOrbit((prev) => ({
        rotX: Math.max(-80, Math.min(-5, prev.rotX + dy * 0.3)),
        rotY: prev.rotY + dx * 0.3,
      }));
    },
    [draggingOrbit, draggingNode, onMoveNode],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDraggingOrbit(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(() => {
    setDraggingOrbit(false);
    setDraggingNode(null);
  }, []);

  /* --- Find camera node for indicator --- */
  const cameraNode = nodes.find((n) => n.kind === 'camera');

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-zinc-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Perspective container */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: '800px' }}
      >
        <div
          className="relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${orbit.rotX}deg) rotateY(${orbit.rotY}deg)`,
          }}
        >
          {/* Grid floor */}
          <div
            className="absolute"
            style={{
              width: '400px',
              height: '400px',
              left: '-200px',
              top: '-200px',
              transform: 'rotateX(90deg) translateZ(-60px)',
              transformStyle: 'preserve-3d',
              backgroundImage:
                'linear-gradient(rgba(113,113,122,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(113,113,122,0.25) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              border: '1px solid rgba(113,113,122,0.15)',
            }}
          />

          {/* Scene elements */}
          {nodes.map((node) => {
            if (!node.transform) return null;
            const { position, rotation } = node.transform;
            const shape = KIND_SHAPES[node.kind] ?? KIND_SHAPES.prop;
            const color = KIND_COLORS[node.kind] ?? '#888';
            const isSelected = node.id === selectedId;

            return (
              <div
                key={node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                className="absolute cursor-pointer"
                title={node.name}
                style={{
                  width: `${shape.width}px`,
                  height: `${shape.height}px`,
                  left: `${-shape.width / 2}px`,
                  top: `${-shape.height / 2}px`,
                  transformStyle: 'preserve-3d',
                  transform: `translate3d(${position.x * 40}px, ${-position.y * 40}px, ${position.z * 40}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
                }}
              >
                {/* Front face */}
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{
                    backgroundColor: color,
                    opacity: 0.7,
                    border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: isSelected ? `0 0 12px ${color}` : 'none',
                    transform: `translateZ(${shape.depth / 2}px)`,
                  }}
                />
                {/* Back face */}
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{
                    backgroundColor: color,
                    opacity: 0.4,
                    transform: `translateZ(${-shape.depth / 2}px) rotateY(180deg)`,
                  }}
                />
                {/* Label */}
                <div
                  className="absolute text-[9px] text-white font-medium whitespace-nowrap text-center pointer-events-none"
                  style={{
                    bottom: '-16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}
                >
                  {node.name}
                </div>
              </div>
            );
          })}

          {/* Camera frustum indicator */}
          {cameraNode && (
            <div
              className="absolute pointer-events-none"
              style={{
                transformStyle: 'preserve-3d',
                transform: `translate3d(${cameraNode.transform.position.x * 40}px, ${-cameraNode.transform.position.y * 40}px, ${cameraNode.transform.position.z * 40}px)`,
              }}
            >
              <div
                className="border-2 border-dashed border-blue-400/50"
                style={{
                  width: '60px',
                  height: '40px',
                  marginLeft: '-30px',
                  marginTop: '-20px',
                  transform: 'translateZ(80px)',
                  borderRadius: '2px',
                }}
              />
              {/* Frustum lines (simplified as a trapezoid) */}
              <svg
                className="absolute"
                width="60"
                height="80"
                style={{ left: '-30px', top: '-20px', transform: 'translateZ(40px)' }}
              >
                <line x1="0" y1="40" x2="15" y2="0" stroke="rgba(96,165,250,0.3)" strokeWidth="1" strokeDasharray="4 2" />
                <line x1="60" y1="40" x2="45" y2="0" stroke="rgba(96,165,250,0.3)" strokeWidth="1" strokeDasharray="4 2" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Orbit info overlay */}
      <div className="absolute bottom-2 left-2 text-[10px] text-zinc-600 font-mono">
        orbit: {orbit.rotX.toFixed(0)} / {orbit.rotY.toFixed(0)}
      </div>
    </div>
  );
}
