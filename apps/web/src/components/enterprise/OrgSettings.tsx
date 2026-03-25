'use client';

import { useState } from 'react';

interface OrgSettingsData {
  orgName: string;
  logoUrl: string;
  samlEndpoint: string;
  samlCertificate: string;
  scimEnabled: boolean;
  dataRetentionDays: number;
  apiRateLimitPerMinute: number;
  apiRateLimitPerDay: number;
}

interface OrgSettingsProps {
  initialData?: Partial<OrgSettingsData>;
  onSave: (data: OrgSettingsData) => void;
}

export default function OrgSettings({ initialData, onSave }: OrgSettingsProps) {
  const [data, setData] = useState<OrgSettingsData>({
    orgName: initialData?.orgName ?? '',
    logoUrl: initialData?.logoUrl ?? '',
    samlEndpoint: initialData?.samlEndpoint ?? '',
    samlCertificate: initialData?.samlCertificate ?? '',
    scimEnabled: initialData?.scimEnabled ?? false,
    dataRetentionDays: initialData?.dataRetentionDays ?? 90,
    apiRateLimitPerMinute: initialData?.apiRateLimitPerMinute ?? 60,
    apiRateLimitPerDay: initialData?.apiRateLimitPerDay ?? 10000,
  });

  const update = <K extends keyof OrgSettingsData>(key: K, value: OrgSettingsData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Organization */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Organization</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Organization Name</label>
            <input
              type="text"
              value={data.orgName}
              onChange={(e) => update('orgName', e.target.value)}
              placeholder="Acme Studios"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Logo</label>
            <div className="flex items-center gap-3">
              {data.logoUrl && (
                <img
                  src={data.logoUrl}
                  alt="Org logo"
                  className="h-10 w-10 rounded-lg object-cover border border-gray-700"
                />
              )}
              <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg border border-gray-700 transition-colors">
                Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      update('logoUrl', URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* SSO Configuration */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">SSO Configuration</h3>
        <div className="grid gap-4">
          <div>
            <label className={labelClass}>SAML Endpoint URL</label>
            <input
              type="url"
              value={data.samlEndpoint}
              onChange={(e) => update('samlEndpoint', e.target.value)}
              placeholder="https://idp.example.com/saml/sso"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>SAML Certificate</label>
            <textarea
              value={data.samlCertificate}
              onChange={(e) => update('samlCertificate', e.target.value)}
              placeholder="-----BEGIN CERTIFICATE-----&#10;Paste your X.509 certificate here...&#10;-----END CERTIFICATE-----"
              rows={5}
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
        </div>
      </section>

      {/* SCIM Provisioning */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">SCIM Provisioning</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Enable SCIM automatic user provisioning</p>
            <p className="text-xs text-gray-500 mt-1">
              Automatically sync users and groups from your identity provider
            </p>
          </div>
          <button
            type="button"
            onClick={() => update('scimEnabled', !data.scimEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              data.scimEnabled ? 'bg-purple-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                data.scimEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Data Retention */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Data Retention Policy</h3>
        <div>
          <label className={labelClass}>Retention Period (days)</label>
          <input
            type="number"
            min={30}
            max={365}
            value={data.dataRetentionDays}
            onChange={(e) => update('dataRetentionDays', parseInt(e.target.value) || 90)}
            className={`${inputClass} max-w-xs`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Audit logs and deleted resources will be purged after this period (30-365 days)
          </p>
        </div>
      </section>

      {/* API Rate Limits */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">API Rate Limits</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Requests per Minute</label>
            <input
              type="number"
              min={10}
              value={data.apiRateLimitPerMinute}
              onChange={(e) => update('apiRateLimitPerMinute', parseInt(e.target.value) || 60)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Requests per Day</label>
            <input
              type="number"
              min={100}
              value={data.apiRateLimitPerDay}
              onChange={(e) => update('apiRateLimitPerDay', parseInt(e.target.value) || 10000)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          Save Settings
        </button>
      </div>
    </form>
  );
}
