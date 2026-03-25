'use client';

interface CollabUser {
  id: string;
  name: string;
  color: string;
}

interface CollabBarProps {
  users?: CollabUser[];
  isConnected?: boolean;
  onInvite?: () => void;
}

const defaultUsers: CollabUser[] = [
  { id: '1', name: 'Alex Chen', color: 'bg-violet-500' },
  { id: '2', name: 'Maya Rivera', color: 'bg-cyan-500' },
  { id: '3', name: 'Jordan Lee', color: 'bg-amber-500' },
];

export default function CollabBar({ users = defaultUsers, isConnected = true, onInvite }: CollabBarProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2">
      {/* Connection status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
        />
        <span className="text-[10px] text-gray-500">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="w-px h-4 bg-gray-700" />

      {/* User avatars */}
      <div className="flex -space-x-1.5">
        {users.map((user) => (
          <div
            key={user.id}
            title={user.name}
            className={`w-6 h-6 rounded-full ${user.color} flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-gray-900`}
          >
            {user.name.charAt(0)}
          </div>
        ))}
      </div>

      <span className="text-[10px] text-gray-500">
        {users.length} online
      </span>

      {/* Invite button */}
      <button
        type="button"
        onClick={onInvite}
        className="ml-auto rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-[10px] font-medium text-gray-300 hover:border-violet-600/50 hover:text-violet-400 transition-colors"
      >
        Invite
      </button>
    </div>
  );
}
