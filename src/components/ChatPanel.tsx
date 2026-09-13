'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, DemoScenario, AgentMode } from '@/lib/types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isProcessing: boolean;
  selectedScenario: DemoScenario | null;
  onToggleSidebar: () => void;
  agentMode?: AgentMode;
  onFallbackToMock?: () => void;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isProcessing,
  selectedScenario,
  onToggleSidebar,
  agentMode = 'groq',
  onFallbackToMock,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isProcessing) return;
    setInput('');
    onSendMessage(text);
  };

  const handleQuickSend = () => {
    if (selectedScenario && !isProcessing) {
      onSendMessage(selectedScenario.message);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const hasError = lastMessage?.role === 'system' && lastMessage.content.toLowerCase().includes('error');

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg hover:bg-[var(--card-hover)] text-[var(--muted)] hover:text-white transition-colors"
            title="Toggle Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Support Resolution Chat</h2>
              <span
                className={`text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  agentMode === 'groq'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : agentMode === 'mock'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}
              >
                {agentMode === 'groq'
                  ? '⚡ Groq AI (Live)'
                  : agentMode === 'mock'
                  ? '🧪 Mock Fallback'
                  : '⚡ Live Agent'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] truncate max-w-md mt-0.5">
              {selectedScenario ? `Active Scenario: ${selectedScenario.name.replace(/^[^\s]+\s/, '')}` : 'Select a preset scenario or type custom query'}
            </p>
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs font-medium text-blue-400 animate-pulse">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            {agentMode === 'groq' ? 'Groq AI reasoning & tool execution...' : 'Agent processing...'}
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md p-6 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-3">
                🤖
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                {agentMode === 'groq' ? 'Autonomous Groq AI Agent' : 'Support Resolution Agent'}
              </h3>
              <p className="text-xs text-[var(--muted)] mb-4 leading-relaxed">
                {agentMode === 'groq'
                  ? 'Powered by Llama 3.3 with real-time tool calling against verified enterprise backend systems (inventory, policy enforcement, refunds, cancellations).'
                  : 'Running in offline Mock Fallback mode with simulated developer traces calling real backend tools.'}
              </p>
              {selectedScenario && (
                <button
                  onClick={handleQuickSend}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 mx-auto"
                >
                  <span>▶</span>
                  <span>Run Preset: {selectedScenario.name.replace(/^[^\s]+\s/, '')}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-fade-in flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl text-sm leading-relaxed transition-all ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs px-4 py-3 whitespace-pre-wrap shadow-sm'
                  : msg.role === 'agent'
                  ? 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-xs p-4 shadow-sm hover:border-[var(--border-hover)]'
                  : 'bg-red-950/25 text-red-200 rounded-xl border border-red-500/35 px-4 py-3 whitespace-pre-wrap'
              }`}
            >
              {msg.role === 'agent' && (
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[var(--border)]/70">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    {agentMode === 'groq' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Groq AI Agent</span>
                        <span className="text-[10px] font-mono font-normal text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/25">
                          Llama 3.3 70B
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>Mock Agent</span>
                        <span className="text-[10px] font-mono font-normal text-amber-400/90 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/25">
                          Simulation Stub
                        </span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-mono opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {msg.role === 'system' && (
                <div className="text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                  <span>⚙️ System Notification</span>
                </div>
              )}

              {msg.role === 'agent' ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                msg.content
              )}

              {msg.role !== 'agent' && (
                <div className="text-[10px] text-white/60 mt-1.5 text-right font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-[var(--card)] border border-[var(--border)] px-4 py-3 rounded-2xl rounded-bl-xs shadow-sm">
              <div className="text-xs text-blue-400 font-semibold mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                {agentMode === 'groq' ? 'Groq AI Agent Reasoning' : 'Mock Agent Reasoning'}
              </div>
              <div className="loading-dots flex gap-1.5 py-1.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Run / Retry Bar */}
      {selectedScenario && messages.length > 0 && !isProcessing && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          <button
            onClick={handleQuickSend}
            className="flex-1 min-w-[200px] px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs text-[var(--muted)] hover:text-white hover:border-blue-500/50 hover:bg-[var(--card-hover)] transition-all text-left flex items-center justify-between shadow-xs"
          >
            <span className="truncate">▶ Re-run: &quot;{selectedScenario.message}&quot;</span>
            <span className="text-[10px] text-blue-400 font-semibold ml-2 shrink-0 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30">
              Run Preset
            </span>
          </button>
          {hasError && (
            <button
              onClick={handleQuickSend}
              className="px-3.5 py-2 bg-red-950/40 text-red-200 border border-red-500/40 rounded-xl text-xs font-semibold hover:bg-red-900/50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>🔄</span>
              <span>Retry</span>
            </button>
          )}
          {hasError && agentMode === 'groq' && onFallbackToMock && (
            <button
              type="button"
              onClick={onFallbackToMock}
              className="px-3.5 py-2 bg-amber-950/40 text-amber-200 border border-amber-500/50 rounded-xl text-xs font-semibold hover:bg-amber-900/50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>🧪</span>
              <span>Mock Fallback</span>
            </button>
          )}
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--card)]/90">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedScenario
                ? 'Type customer query or message (e.g. "Where is my order?")...'
                : 'Select a preset scenario or type a customer inquiry...'
            }
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <span>Send</span>
            <span>↵</span>
          </button>
        </div>
      </form>
    </div>
  );
}
