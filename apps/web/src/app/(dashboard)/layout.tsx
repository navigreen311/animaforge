'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type AuthUser } from '@/stores/authStore';
import Sidebar from '@/components/shared/Sidebar';
import TopBar from '@/components/shared/TopBar';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function UserMenu({ user }: { user: AuthUser }) {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800 transition-colors"
        aria-label="User menu"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
        )}
        <span className="text-sm text-gray-300 max-w-[120px] truncate hidden md:block">
          {user.displayName}
        </span>
      </button>
      <div className="invisible group-hover:visible absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-xl z-50">
        <div className="px-4 py-2 border-b border-gray-800">
          <p className="text-sm font-medium text-gray-200 truncate">{user.displayName}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
        <div className="py-1">
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
            onClick={() => router.push('/settings')}
          >
            Settings
          </button>
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Sidebar />
        <div className="ml-[240px] flex flex-col min-h-screen">
          <div className="sticky top-0 z-30 flex items-center justify-between">
            <div className="flex-1">
              <TopBar />
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
              {user && <UserMenu user={user} />}
            </div>
          </div>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
