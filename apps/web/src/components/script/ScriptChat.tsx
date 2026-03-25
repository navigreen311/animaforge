'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  'Refine this scene',
  'Add more detail',
  'Change the mood',
  'Add dialogue',
  'Make it shorter',
  'Increase tension',
];

interface ScriptChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ScriptChat({ messages, onSend, isLoading }: ScriptChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-700 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Script Chat
        </h3>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        style={{ maxHeight: '320px', minHeight: '200px' }}
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-600">
            Start a conversation to refine your script...
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'border border-zinc-700 bg-zinc-800 text-zinc-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-zinc-500"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-zinc-500"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-1.5 border-t border-zinc-800 px-4 py-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            onClick={() => onSend(action)}
            disabled={isLoading}
            className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-400 transition hover:border-violet-500 hover:text-violet-300 disabled:opacity-50"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-zinc-700 px-4 py-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask AI to refine the script..."
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-violet-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
