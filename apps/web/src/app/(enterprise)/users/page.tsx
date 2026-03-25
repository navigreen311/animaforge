'use client';

import { useState } from 'react';
import UserTable, { User } from '@/components/enterprise/UserTable';
import InviteUserModal from '@/components/enterprise/InviteUserModal';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah@acme.studio', role: 'admin', tier: 'Enterprise', status: 'active', lastActive: '2026-03-25' },
  { id: '2', name: 'Marcus Webb', email: 'marcus@acme.studio', role: 'creator', tier: 'Pro', status: 'active', lastActive: '2026-03-24' },
  { id: '3', name: 'Aisha Patel', email: 'aisha@acme.studio', role: 'editor', tier: 'Enterprise', status: 'active', lastActive: '2026-03-25' },
  { id: '4', name: 'James Ortiz', email: 'james@acme.studio', role: 'creator', tier: 'Pro', status: 'inactive', lastActive: '2026-02-18' },
  { id: '5', name: 'Lena Kim', email: 'lena@acme.studio', role: 'editor', tier: 'Enterprise', status: 'active', lastActive: '2026-03-23' },
  { id: '6', name: 'David Nowak', email: 'david@acme.studio', role: 'creator', tier: 'Starter', status: 'active', lastActive: '2026-03-20' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleRoleChange = (userId: string, newRole: 'creator' | 'editor' | 'admin') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
          : u
      )
    );
  };

  const handleInvite = (data: { email: string; role: string; team: string }) => {
    const newUser: User = {
      id: String(Date.now()),
      name: data.email.split('@')[0],
      email: data.email,
      role: data.role as 'creator' | 'editor' | 'admin',
      tier: 'Starter',
      status: 'active',
      lastActive: new Date().toISOString().split('T')[0],
    };
    setUsers((prev) => [...prev, newUser]);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-gray-400 mt-1">
              {users.length} users &middot; {users.filter((u) => u.status === 'active').length} active
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Invite User
          </button>
        </div>

        <UserTable
          users={users}
          onRoleChange={handleRoleChange}
          onToggleStatus={handleToggleStatus}
        />

        <InviteUserModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvite={handleInvite}
          teams={['Animation', 'VFX', 'Design', 'Engineering']}
        />
      </div>
    </div>
  );
}
