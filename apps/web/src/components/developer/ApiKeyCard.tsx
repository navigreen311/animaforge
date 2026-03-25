'use client';

import { useState } from 'react';

interface ApiKeyCardProps {
  name: string;
  keyValue: string;
  scopes: string[];
  created: string;
  expires: string;
  onRevoke: () => void;
}

export default function ApiKeyCard({ name, keyValue, scopes, created, expires, onRevoke }: ApiKeyCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const maskedKey = keyValue.slice(0, 8) + '••••••••••••••••' + keyValue.slice(-4);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(keyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-100">{name}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="text-sm text-gray-400 font-mono">
            {revealed ? keyValue : maskedKey}
          </code>
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={revealed ? 'Hide key' : 'Reveal key'}
          >
            {revealed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Copy key"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {scopes.map((scope) => (
            <span key={scope} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-900/30 text-violet-300 border border-violet-700/50">
              {scope}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">{created}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{expires}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onRevoke}
          className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-red-800/50 rounded-lg transition-colors"
        >
          Revoke
        </button>
      </td>
    </tr>
  );
}
