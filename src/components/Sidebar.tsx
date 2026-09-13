'use client';

import { DemoScenario, AgentMode } from '@/lib/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  scenarios: DemoScenario[];
  selectedScenario: DemoScenario | null;
  onSelectScenario: (scenario: DemoScenario) => void;
  agentMode: AgentMode;
  onSetAgentMode: (mode: AgentMode) => void;
  onReset: () => void;
  groqConfigured?: boolean;
}

export default function Sidebar({
  isOpen,
  onToggle,
  scenarios,
  selectedScenario,
  onSelectScenario,
  agentMode,
  onSetAgentMode,
  onReset,
  groqConfigured = false,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed lg:relative z-40 h-full bg-[var(--card)] border-r border-[var(--border)] transition-all duration-300 flex flex-col ${
          isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'
        } overflow-hidden shadow-xl lg:shadow-none`}
      >
        <div className="min-w-[320px] h-full flex flex-col">
          {/* Brand Header */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-base shadow-sm">
                🤖
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  Resolution Agent
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h1>
                <p className="text-[11px] text-[var(--muted)]">Smart Automation Console</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--card-hover)] text-[var(--muted)] hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="p-4 border-b border-[var(--border)] bg-[var(--background)]/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                Execution Mode
              </label>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider border ${
                  groqConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {groqConfigured ? 'Groq Active' : 'Offline Mock'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSetAgentMode('groq')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex flex-col items-center gap-0.5 ${
                  agentMode === 'groq'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]'
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--border-hover)]'
                }`}
              >
                <span className="flex items-center gap-1">⚡ Groq AI</span>
                <span className="text-[9px] opacity-75 font-mono">Llama 3.3 70B</span>
              </button>
              <button
                onClick={() => onSetAgentMode('mock')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex flex-col items-center gap-0.5 ${
                  agentMode === 'mock'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-[0_0_12px_-2px_rgba(245,158,11,0.2)]'
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--border-hover)]'
                }`}
              >
                <span className="flex items-center gap-1">🧪 Mock Mode</span>
                <span className="text-[9px] opacity-75 font-mono">Deterministic</span>
              </button>
            </div>

            <div className="mt-2.5 p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[11px] text-[var(--muted)] leading-relaxed">
              {agentMode === 'groq' ? (
                <>
                  <strong className="text-emerald-300 font-semibold">⚡ Groq AI Active:</strong> Live reasoning with tool calling against backend systems. Verified state updates.
                </>
              ) : (
                <>
                  <strong className="text-amber-300 font-semibold">🧪 Mock Active:</strong> Local simulation stub verifying flow logic without external API dependencies.
                </>
              )}
            </div>
          </div>

          {/* Demo Scenarios */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-1">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                Preset Scenarios
              </label>
              <span className="text-[10px] font-mono text-[var(--muted)]">{scenarios.length} presets</span>
            </div>

            {scenarios.map((scenario) => {
              const isSelected = selectedScenario?.id === scenario.id;
              const isOos = scenario.id === 'oos-replacement';
              return (
                <button
                  key={scenario.id}
                  onClick={() => onSelectScenario(scenario)}
                  className={`w-full text-left p-3 rounded-xl transition-all border text-xs ${
                    isSelected
                      ? 'border-blue-500/60 bg-blue-950/20 text-white shadow-[0_0_14px_-2px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/40'
                      : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-semibold text-white truncate text-[13px]">{scenario.name}</span>
                    {isOos && (
                      <span className="text-[9px] bg-red-500/15 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed">
                    {scenario.description}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-[var(--border)]/60 flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
                    <span className="bg-black/30 px-1.5 py-0.5 rounded border border-white/5">{scenario.customer_id}</span>
                    <span className="bg-black/30 px-1.5 py-0.5 rounded border border-white/5">{scenario.order_id}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Persistence & Reset Footer */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--card)] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span>Persistence Layer:</span>
              <span className="text-amber-400 font-semibold font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                In-Memory
              </span>
            </div>
            <button
              onClick={onReset}
              className="w-full px-3 py-2 bg-[var(--card-hover)] hover:bg-red-950/30 hover:border-red-500/40 text-[var(--muted)] hover:text-red-300 rounded-xl text-xs font-semibold transition-all border border-[var(--border)] flex items-center justify-center gap-1.5"
            >
              <span>🔄</span>
              <span>Reset World State</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
