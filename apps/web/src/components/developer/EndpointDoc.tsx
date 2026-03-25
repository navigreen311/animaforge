'use client';

import { useState } from 'react';
import CodeBlock from './CodeBlock';

interface EndpointDocProps {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  requestExample?: string;
  responseExample: string;
  tryItOut?: boolean;
}

const methodColors: Record<string, string> = {
  GET: 'bg-green-900/50 text-green-300 border-green-700',
  POST: 'bg-blue-900/50 text-blue-300 border-blue-700',
  PUT: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  PATCH: 'bg-orange-900/50 text-orange-300 border-orange-700',
  DELETE: 'bg-red-900/50 text-red-300 border-red-700',
};

export default function EndpointDoc({
  method,
  path,
  description,
  requestExample,
  responseExample,
  tryItOut = false,
}: EndpointDocProps) {
  const [expanded, setExpanded] = useState(false);
  const [requestBody, setRequestBody] = useState(requestExample ?? '');
  const [tryResponse, setTryResponse] = useState<string | null>(null);

  const handleTryIt = () => {
    setTryResponse(responseExample);
  };

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${methodColors[method]}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-gray-200">{path}</code>
        <span className="text-sm text-gray-500 ml-auto mr-2">{description}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-800">
          <p className="text-sm text-gray-400 pt-3">{description}</p>

          {requestExample && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Request Body</h4>
              <CodeBlock code={requestExample} language="json" title="application/json" />
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Response</h4>
            <CodeBlock code={responseExample} language="json" title="200 OK" />
          </div>

          {tryItOut && (
            <div className="pt-2 border-t border-gray-800">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Try It Out</h4>
              {requestExample && (
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none mb-3"
                  placeholder="Enter request body..."
                />
              )}
              <button
                type="button"
                onClick={handleTryIt}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Send Request
              </button>
              {tryResponse && (
                <div className="mt-3">
                  <CodeBlock code={tryResponse} language="json" title="Response" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
