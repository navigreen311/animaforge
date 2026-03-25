'use client';

import { useState } from 'react';

type Role = 'creator' | 'editor' | 'admin';
type Status = 'active' | 'inactive';
type SortField = 'name' | 'email' | 'role' | 'tier' | 'status' | 'lastActive';
type SortDir = 'asc' | 'desc';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tier: string;
  status: Status;
  lastActive: string;
}

interface UserTableProps {
  users: User[];
  onRoleChange: (userId: string, newRole: Role) => void;
  onToggleStatus: (userId: string) => void;
}

export default function UserTable({ users, onRoleChange, onToggleStatus }: UserTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...users].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-purple-400">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900">
          <tr>
            <SortHeader field="name">Name</SortHeader>
            <SortHeader field="email">Email</SortHeader>
            <SortHeader field="role">Role</SortHeader>
            <SortHeader field="tier">Tier</SortHeader>
            <SortHeader field="status">Status</SortHeader>
            <SortHeader field="lastActive">Last Active</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-950">
          {sorted.map((user) => (
            <tr key={user.id} className="hover:bg-gray-900/50 transition-colors">
              <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{user.name}</td>
              <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{user.email}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <select
                  value={user.role}
                  onChange={(e) => onRoleChange(user.id, e.target.value as Role)}
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-2 py-1 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="creator">Creator</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                  {user.tier}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {user.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{user.lastActive}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  onClick={() => onToggleStatus(user.id)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                    user.status === 'active'
                      ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
                      : 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40'
                  }`}
                >
                  {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
