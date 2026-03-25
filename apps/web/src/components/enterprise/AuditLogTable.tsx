'use client';

import { useState } from 'react';

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceId: string;
  ip: string;
}

type ActionType = 'all' | 'create' | 'update' | 'delete' | 'login' | 'export' | 'invite';

interface AuditLogTableProps {
  entries: AuditEntry[];
  onExport: () => void;
}

export default function AuditLogTable({ entries, onExport }: AuditLogTableProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionType>('all');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = entries.filter((entry) => {
    if (dateFrom && entry.timestamp < dateFrom) return false;
    if (dateTo && entry.timestamp > dateTo) return false;
    if (userFilter && !entry.user.toLowerCase().includes(userFilter.toLowerCase())) return false;
    if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const actionColors: Record<string, string> = {
    create: 'bg-emerald-900/30 text-emerald-400',
    update: 'bg-blue-900/30 text-blue-400',
    delete: 'bg-red-900/30 text-red-400',
    login: 'bg-purple-900/30 text-purple-400',
    export: 'bg-amber-900/30 text-amber-400',
    invite: 'bg-cyan-900/30 text-cyan-400',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">User</label>
          <input
            type="text"
            placeholder="Filter by user..."
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value as ActionType); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="export">Export</option>
            <option value="invite">Invite</option>
          </select>
        </div>
        <button
          onClick={onExport}
          className="ml-auto bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium px-4 py-1.5 rounded-lg border border-gray-700 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              {['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'IP Address'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {paginated.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap font-mono text-xs">
                  {entry.timestamp}
                </td>
                <td className="px-4 py-3 text-white whitespace-nowrap">{entry.user}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColors[entry.action] || 'bg-gray-800 text-gray-300'}`}>
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{entry.resource}</td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                  {entry.resourceId}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                  {entry.ip}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No audit entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}
          {' - '}
          {Math.min(page * perPage, filtered.length)} of {filtered.length} entries
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-gray-300">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
