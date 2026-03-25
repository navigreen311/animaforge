'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: 'json' | 'curl' | 'bash';
  title?: string;
}

const languageColors: Record<string, string> = {
  json: 'text-yellow-300',
  curl: 'text-green-300',
  bash: 'text-green-300',
};

function highlightJson(code: string): string {
  return code
    .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-violet-400">"$1"</span>')
    .replace(/:\s*"([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
    .replace(/:\s*(\d+)/g, ': <span class="text-yellow-300">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="text-orange-400">$1</span>');
}

export default function CodeBlock({ code, language = 'json', title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlighted = language === 'json' ? highlightJson(code) : code;

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700">
          <span className={`text-xs font-medium ${languageColors[language] ?? 'text-gray-400'}`}>
            {title}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      {!title && (
        <div className="flex justify-end px-4 py-1.5 bg-gray-800/80 border-b border-gray-700">
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      <pre className="p-4 bg-gray-950 overflow-x-auto text-sm leading-relaxed">
        <code
          className={`${languageColors[language] ?? 'text-gray-300'}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
