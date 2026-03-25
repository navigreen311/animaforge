'use client';

import OrgSettings from '@/components/enterprise/OrgSettings';

export default function SettingsPage() {
  const handleSave = (data: Record<string, unknown>) => {
    // In production, this would POST to an API endpoint
    console.log('Saving org settings:', data);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Organization Settings</h1>
          <p className="text-gray-400 mt-1">
            Configure your organization, SSO, provisioning, and platform limits.
          </p>
        </div>

        <OrgSettings
          initialData={{
            orgName: 'Acme Studios',
            scimEnabled: false,
            dataRetentionDays: 90,
            apiRateLimitPerMinute: 60,
            apiRateLimitPerDay: 10000,
          }}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
