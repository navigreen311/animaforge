'use client';

import AuditLogTable, { AuditEntry } from '@/components/enterprise/AuditLogTable';

const MOCK_ENTRIES: AuditEntry[] = [
  { id: '1', timestamp: '2026-03-25 14:32:01', user: 'sarah@acme.studio', action: 'update', resource: 'project', resourceId: 'proj_8f2a', ip: '192.168.1.42' },
  { id: '2', timestamp: '2026-03-25 14:28:15', user: 'marcus@acme.studio', action: 'create', resource: 'character', resourceId: 'char_3d9b', ip: '10.0.0.15' },
  { id: '3', timestamp: '2026-03-25 13:55:44', user: 'aisha@acme.studio', action: 'export', resource: 'scene', resourceId: 'scn_71ef', ip: '172.16.0.8' },
  { id: '4', timestamp: '2026-03-25 13:12:30', user: 'sarah@acme.studio', action: 'invite', resource: 'user', resourceId: 'usr_new1', ip: '192.168.1.42' },
  { id: '5', timestamp: '2026-03-25 12:48:09', user: 'james@acme.studio', action: 'delete', resource: 'asset', resourceId: 'ast_44cc', ip: '10.0.0.22' },
  { id: '6', timestamp: '2026-03-25 11:30:00', user: 'lena@acme.studio', action: 'login', resource: 'session', resourceId: 'ses_99ab', ip: '172.16.0.33' },
  { id: '7', timestamp: '2026-03-25 10:15:22', user: 'david@acme.studio', action: 'create', resource: 'project', resourceId: 'proj_a1b2', ip: '10.0.0.41' },
  { id: '8', timestamp: '2026-03-24 18:42:11', user: 'sarah@acme.studio', action: 'update', resource: 'settings', resourceId: 'org_main', ip: '192.168.1.42' },
  { id: '9', timestamp: '2026-03-24 16:05:33', user: 'marcus@acme.studio', action: 'create', resource: 'shot', resourceId: 'sht_5e6f', ip: '10.0.0.15' },
  { id: '10', timestamp: '2026-03-24 14:22:08', user: 'aisha@acme.studio', action: 'update', resource: 'character', resourceId: 'char_3d9b', ip: '172.16.0.8' },
];

export default function AuditPage() {
  const handleExport = () => {
    // In production, this would call an API endpoint to generate and download a CSV
    const csv = [
      'Timestamp,User,Action,Resource,Resource ID,IP',
      ...MOCK_ENTRIES.map(
        (e) => `${e.timestamp},${e.user},${e.action},${e.resource},${e.resourceId},${e.ip}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-400 mt-1">
            Track all activity across your organization.
          </p>
        </div>

        <AuditLogTable entries={MOCK_ENTRIES} onExport={handleExport} />
      </div>
    </div>
  );
}
