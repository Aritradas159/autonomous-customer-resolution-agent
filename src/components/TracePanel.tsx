'use client';

import { TraceEvent, AgentMode } from '@/lib/types';

interface TracePanelProps {
  events: TraceEvent[];
  mode?: AgentMode;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  decision: { icon: '🧠', color: 'var(--info)', label: 'Decision' },
  tool_called: { icon: '🔧', color: 'var(--primary)', label: 'Tool Called' },
  tool_result: { icon: '📋', color: 'var(--primary)', label: 'Tool Result' },
  action_completed: { icon: '✅', color: 'var(--success)', label: 'Action Completed' },
  action_failed: { icon: '❌', color: 'var(--error)', label: 'Action Failed (Blocked)' },
  replanning: { icon: '🔄', color: 'var(--warning)', label: 'Replanning Strategy' },
  state_verification: { icon: '🔍', color: 'var(--accent)', label: 'State Verification' },
  escalation: { icon: '⚠️', color: 'var(--warning)', label: 'Escalation' },
  final_resolution: { icon: '🎯', color: 'var(--success)', label: 'Final Resolution' },
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label?: string }> = {
  success: { bg: 'rgba(16,185,129,0.15)', text: 'var(--success)', label: 'SUCCESS' },
  failure: { bg: 'rgba(239,68,68,0.25)', text: '#f87171', label: 'FAILED / BLOCKED' },
  info: { bg: 'rgba(99,102,241,0.15)', text: 'var(--info)', label: 'INFO' },
  warning: { bg: 'rgba(245,158,11,0.20)', text: 'var(--warning)', label: 'WARNING' },
  pending: { bg: 'rgba(107,114,128,0.15)', text: 'var(--muted)', label: 'PENDING' },
};

export default function TracePanel({ events, mode = 'groq' }: TracePanelProps) {
  return (
    <div className="flex flex-col h-full bg-[var(--card)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[#0d1117]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 text-xs">
              🔍
            </span>
            <h3 className="text-sm font-semibold text-white tracking-wide">Execution Trace</h3>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                mode === 'groq'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 glow-emerald'
                  : mode === 'mock'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
              }`}
            >
              {mode === 'groq'
                ? '⚡ Groq AI (Live)'
                : mode === 'mock'
                ? '🧪 Mock Simulation'
                : '⚡ Live Agent'}
            </span>
          </div>
          {events.length > 0 && (
            <div className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Step {events[events.length - 1].step} / {events.length}</span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-1.5 leading-relaxed">
          {mode === 'groq'
            ? 'Real-time decision and tool-calling events streamed from Groq AI executing backend enterprise tools.'
            : mode === 'mock'
            ? 'Chronological event trace produced by local deterministic test stub calling actual backend tools.'
            : 'Live stream of decision events delivered from external AI Agent service.'}
        </p>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080a0f]">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-6">
            <div className="max-w-xs p-6 rounded-2xl border border-dashed border-[#21262d] bg-[#0d1117]/60">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mx-auto mb-3">
                📊
              </div>
              <p className="text-sm font-semibold text-white">No Trace Events Recorded</p>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                Trigger a demo scenario or send a customer support message to inspect the agent reasoning pipeline in real time.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => {
              const config = TYPE_CONFIG[event.type] || { icon: '📌', color: 'var(--muted)', label: event.type };
              const badge = STATUS_BADGE[event.status] || STATUS_BADGE.info;
              const isFailure = event.status === 'failure' || event.type === 'action_failed';
              const isReplanning = event.type === 'replanning';
              const isSuccess = event.status === 'success' || event.type === 'action_completed' || event.type === 'final_resolution';

              return (
                <div
                  key={idx}
                  className={`animate-slide-in rounded-xl p-3.5 transition-all border ${
                    isFailure
                      ? 'bg-red-950/20 border-red-500/40 text-red-100 shadow-[0_0_16px_rgba(239,68,68,0.12)]'
                      : isReplanning
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.1)]'
                      : isSuccess
                      ? 'bg-emerald-950/15 border-emerald-500/30 shadow-[0_0_14px_rgba(16,185,129,0.08)]'
                      : 'bg-[#0d1117] border-[#21262d] hover:border-[#30363d]'
                  }`}
                  style={{ animationDelay: `${idx * 35}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Step number badge */}
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold border ${
                        isFailure
                          ? 'bg-red-500/20 text-red-400 border-red-500/40 glow-red'
                          : isReplanning
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : isSuccess
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 glow-emerald'
                          : 'bg-white/5 text-gray-300 border-white/10'
                      }`}
                    >
                      {event.step}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Type label + status badge */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className="text-xs font-semibold flex items-center gap-1.5"
                          style={{
                            color: isFailure ? '#f87171' : isSuccess ? '#34d399' : config.color,
                          }}
                        >
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            isFailure
                              ? 'bg-red-900/40 text-red-300 border-red-500/40 glow-red'
                              : isReplanning
                              ? 'bg-amber-900/40 text-amber-300 border-amber-500/40'
                              : isSuccess
                              ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40 glow-emerald'
                              : 'border-transparent'
                          }`}
                          style={{
                            backgroundColor: (isFailure || isReplanning || isSuccess) ? undefined : badge.bg,
                            color: (isFailure || isReplanning || isSuccess) ? undefined : badge.text,
                            borderColor: (isFailure || isReplanning || isSuccess) ? undefined : `${badge.text}40`,
                          }}
                        >
                          {badge.label || event.status}
                        </span>
                      </div>

                      {/* Description */}
                      <p
                        className={`text-xs mt-2 leading-relaxed ${
                          isFailure ? 'text-red-200 font-medium' : 'text-gray-200'
                        }`}
                      >
                        {event.description}
                      </p>

                      {/* Tool info */}
                      {event.tool_name && (
                        <div className="mt-2 text-xs flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-[var(--muted)] font-medium">Tool Invoked:</span>
                          <code className="text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded font-mono text-[11px]">
                            {event.tool_name}
                          </code>
                          {isFailure && (
                            <span className="text-[10px] text-red-400 font-semibold italic bg-red-950/40 px-2 py-0.5 rounded border border-red-500/30">
                              Returned failure — verified honestly
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tool output inspector (collapsed by default) */}
                      {event.tool_output && (
                        <details className="mt-2.5 text-xs group">
                          <summary className="text-[11px] text-[var(--muted)] cursor-pointer hover:text-white transition-colors flex items-center gap-1">
                            <span className="text-[10px] transition-transform group-open:rotate-90">▶</span>
                            <span>Inspect tool response payload</span>
                          </summary>
                          <pre className="mt-1.5 text-[11px] text-gray-300 bg-[#080a0f] p-3 rounded-lg border border-[#21262d] overflow-x-auto font-mono leading-relaxed">
                            {JSON.stringify(event.tool_output, null, 2)}
                          </pre>
                        </details>
                      )}

                      {/* Timestamp */}
                      <div className="text-[10px] text-[var(--muted)] mt-2 font-mono opacity-70">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
