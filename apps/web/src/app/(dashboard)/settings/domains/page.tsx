'use client';

import { useState } from 'react';
import { Globe, Plus, Trash2, RefreshCw, Lock, ExternalLink, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Domain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  sslStatus: 'pending' | 'issued' | 'failed';
  cnameTarget: string;
}

const MOCK: Domain[] = [
  { id: 'cd_001', domain: 'reviews.acmecorp.com', status: 'verified', sslStatus: 'issued', cnameTarget: 'review.animaforge.com' },
  { id: 'cd_002', domain: 'preview.studio.io', status: 'pending', sslStatus: 'pending', cnameTarget: 'review.animaforge.com' },
];

export default function CustomDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>(MOCK);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const isEnterprise = true; // mock

  const handleAdd = () => {
    if (!newDomain.trim()) return;
    const d: Domain = {
      id: `cd_${Date.now()}`,
      domain: newDomain.trim(),
      status: 'pending',
      sslStatus: 'pending',
      cnameTarget: 'review.animaforge.com',
    };
    setDomains([...domains, d]);
    setNewDomain('');
    setShowAdd(false);
    toast.success('Domain added — configure DNS to verify');
  };

  const handleVerify = (id: string) => {
    toast.loading('Verifying CNAME...');
    setTimeout(() => {
      setDomains((ds) => ds.map((d) => (d.id === id ? { ...d, status: 'verified', sslStatus: 'issued' } : d)));
      toast.dismiss();
      toast.success('Domain verified — SSL issued');
    }, 1500);
  };

  const handleDelete = (id: string) => {
    setDomains((ds) => ds.filter((d) => d.id !== id));
    toast.success('Domain removed');
  };

  if (!isEnterprise) {
    return (
      <div style={{ padding: 40, maxWidth: 720, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
          <Lock size={32} style={{ color: 'var(--brand)', marginBottom: 16 }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Custom Domains require Enterprise</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Upgrade to use your own domain for review portals.</p>
          <button style={{ padding: '10px 20px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
            Upgrade to Enterprise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 880 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, marginBottom: 4 }}>Custom Domains</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Use your own domain for review portals (e.g. reviews.yourbrand.com)
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {domains.map((d) => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: 16,
            background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            <Globe size={18} color="var(--text-secondary)" />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>{d.domain}</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>CNAME → {d.cnameTarget}</div>
            </div>
            <span style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 12,
              background: d.status === 'verified' ? 'rgba(16,185,129,0.15)' : 'rgba(234,179,8,0.15)',
              color: d.status === 'verified' ? '#10b981' : '#eab308',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {d.status === 'verified' ? <Check size={10} /> : <Clock size={10} />}
              {d.status}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>SSL: {d.sslStatus}</span>
            {d.status === 'pending' && (
              <button onClick={() => handleVerify(d.id)} aria-label="Verify domain" style={{ padding: 6, background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer' }}>
                <RefreshCw size={13} />
              </button>
            )}
            <button onClick={() => handleDelete(d.id)} aria-label="Delete domain" style={{ padding: 6, background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{
            padding: 16, background: 'transparent', border: '0.5px dashed var(--border)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          }}>
            <Plus size={14} /> Add domain
          </button>
        ) : (
          <div style={{ padding: 20, background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Domain</label>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="reviews.yourbrand.com"
              autoFocus
              aria-label="Domain name"
              style={{ width: '100%', padding: 10, background: 'var(--bg-base)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, marginBottom: 12 }}
            />
            <div style={{ background: 'var(--bg-base)', padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>DNS Setup:</strong><br />
              Type: CNAME · Host: reviews · Points to: review.animaforge.com<br />
              <span style={{ color: 'var(--text-tertiary)' }}>After updating DNS, click Verify (can take up to 48 hours)</span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '8px 14px', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} style={{ padding: '8px 14px', background: 'var(--brand)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Add domain</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
