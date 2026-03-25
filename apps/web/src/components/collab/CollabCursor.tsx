'use client';

interface CollabCursorProps {
  userName: string;
  color: string;
  x: number;
  y: number;
}

export default function CollabCursor({ userName, color, x, y }: CollabCursorProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-150 ease-out"
      style={{ left: x, top: y }}
    >
      {/* Cursor pointer */}
      <svg
        className="w-4 h-4"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M1 1L6.5 14L8.5 8.5L14 6.5L1 1Z"
          fill={color}
          stroke={color}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </svg>

      {/* User label */}
      <div
        className="ml-3 -mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
    </div>
  );
}
