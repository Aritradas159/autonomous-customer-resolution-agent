'use client';

import { Customer, Order, InventoryItem, Case } from '@/lib/types';

interface StatePanelProps {
  customer: Customer | null;
  order: Order | null;
  inventory: InventoryItem[];
  currentCase: Case | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'rgba(245,158,11,0.15)', text: 'var(--warning)' },
  PROCESSING: { bg: 'rgba(59,130,246,0.15)', text: 'var(--primary)' },
  SHIPPED: { bg: 'rgba(99,102,241,0.15)', text: 'var(--info)' },
  DELIVERED: { bg: 'rgba(16,185,129,0.15)', text: 'var(--success)' },
  CANCELLED: { bg: 'rgba(239,68,68,0.15)', text: 'var(--error)' },
};

const RESOLUTION_COLORS: Record<string, { bg: string; text: string }> = {
  NONE: { bg: 'rgba(107,114,128,0.15)', text: 'var(--muted)' },
  REFUND_PROCESSED: { bg: 'rgba(16,185,129,0.15)', text: 'var(--success)' },
  REPLACEMENT_PROCESSED: { bg: 'rgba(59,130,246,0.15)', text: 'var(--primary)' },
  CANCELLED: { bg: 'rgba(245,158,11,0.15)', text: 'var(--warning)' },
  ESCALATED: { bg: 'rgba(239,68,68,0.15)', text: 'var(--error)' },
};

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  VIP: { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  Premium: { bg: 'rgba(139,92,246,0.2)', text: '#a78bfa' },
  Standard: { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af' },
};

export default function StatePanel({ customer, order, inventory, currentCase }: StatePanelProps) {
  const hasData = customer || order;

  return (
    <div className="flex flex-col h-full bg-[#080a0f]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[#0d1117] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 text-xs">
              📋
            </span>
            <h3 className="text-sm font-semibold text-white tracking-wide">Live Enterprise State</h3>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1.5 glow-emerald">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Synchronized
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-1">
            Verified backend data from Next.js Route Handlers
          </p>
        </div>
        {currentCase && (
          <span className="text-[11px] font-mono bg-white/5 px-2.5 py-1 rounded-full border border-white/10 text-gray-300">
            {currentCase.case_id}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-center p-6">
            <div className="max-w-xs p-6 rounded-2xl border border-dashed border-[#21262d] bg-[#0d1117]/60">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mx-auto mb-3">
                📦
              </div>
              <p className="text-sm font-semibold text-white">No State Loaded</p>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                Select a demo scenario or initiate customer resolution to inspect real-time customer and order records.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Customer Info Card */}
            {customer && (
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3.5 shadow-xs transition-all hover:border-[#30363d]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👤</span> Customer Profile
                  </span>
                  <span
                    className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: (TIER_COLORS[customer.tier] || TIER_COLORS.Standard).bg,
                      color: (TIER_COLORS[customer.tier] || TIER_COLORS.Standard).text,
                      borderColor: `${(TIER_COLORS[customer.tier] || TIER_COLORS.Standard).text}40`,
                    }}
                  >
                    {customer.tier === 'VIP' ? '⭐ VIP TIER' : `${customer.tier} TIER`}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-bold text-white tracking-tight">{customer.name}</div>
                  <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {customer.customer_id}
                  </span>
                </div>
                <div className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="text-gray-300">{customer.email}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 font-mono text-[11px]">{customer.phone}</span>
                </div>
              </div>
            )}

            {/* Order Info Card */}
            {order && (
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3.5 shadow-xs space-y-3 transition-all hover:border-[#30363d]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📦</span> Order Details
                  </span>
                  <span
                    className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: (STATUS_COLORS[order.status] || STATUS_COLORS.PENDING).bg,
                      color: (STATUS_COLORS[order.status] || STATUS_COLORS.PENDING).text,
                      borderColor: `${(STATUS_COLORS[order.status] || STATUS_COLORS.PENDING).text}40`,
                    }}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-mono font-bold text-white tracking-wide">{order.order_id}</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Total: ${order.total_amount.toFixed(2)}
                  </span>
                </div>

                {/* Items */}
                <div className="pt-2 border-t border-[#21262d] space-y-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Order Line Items:</span>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-[#161b22] p-2.5 rounded-lg border border-[#21262d]">
                      <div className="truncate pr-2">
                        <div className="text-white font-medium truncate">{item.item_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sku}</div>
                      </div>
                      <span className="text-gray-200 font-mono font-semibold shrink-0 bg-white/5 px-2 py-1 rounded border border-white/10">
                        {item.quantity} × ${item.unit_price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Resolution State */}
                <div className="pt-2.5 border-t border-[#21262d] flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Backend Resolution:</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      order.resolution_state === 'REFUND_PROCESSED'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 glow-emerald'
                        : order.resolution_state === 'ESCALATED'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40 glow-red'
                        : order.resolution_state === 'CANCELLED'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-gray-800/40 text-gray-300 border-gray-700/50'
                    }`}
                  >
                    {order.resolution_state}
                  </span>
                </div>
              </div>
            )}

            {/* Inventory Inspection Card */}
            {inventory.length > 0 && (
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3.5 shadow-xs space-y-2.5 transition-all hover:border-[#30363d]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏬</span> SKU Inventory Availability
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Live Tool Check
                  </span>
                </div>
                <div className="space-y-2">
                  {inventory.map((item) => {
                    const isOos = item.quantity_in_stock <= 0;
                    return (
                      <div
                        key={item.sku}
                        className={`p-2.5 rounded-lg border flex flex-col gap-1.5 text-xs transition-all ${
                          isOos
                            ? 'bg-red-950/20 border-red-500/40 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.1)]'
                            : 'bg-[#161b22] border-[#21262d] text-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-medium text-white truncate pr-1">{item.item_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                              isOos
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 glow-red'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {isOos ? '0 IN STOCK (OUT OF STOCK)' : `${item.quantity_in_stock} in stock`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                          <span className="bg-black/20 px-1.5 py-0.5 rounded border border-white/5">{item.sku}</span>
                          {item.restock_date && (
                            <span className="text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded">
                              Restock: {new Date(item.restock_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Case Status Card */}
            {currentCase && (
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3.5 shadow-xs space-y-2 transition-all hover:border-[#30363d]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📑</span> Case Lifecycle
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      currentCase.status === 'resolved'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 glow-emerald'
                        : currentCase.status === 'escalated'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40 glow-red'
                        : currentCase.status === 'in_progress'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-white/5 text-gray-300 border-white/10'
                    }`}
                  >
                    {currentCase.status}
                  </span>
                </div>
                {currentCase.resolution_summary && (
                  <p className="text-xs text-gray-200 leading-relaxed pt-1 bg-[#161b22] p-2.5 rounded-lg border border-[#21262d]">
                    {currentCase.resolution_summary}
                  </p>
                )}
              </div>
            )}

            {/* Order Event Audit Trail Card */}
            {order && order.history && order.history.length > 0 && (
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3.5 shadow-xs space-y-2.5 transition-all hover:border-[#30363d]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🕒</span> Order Event History Audit
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {order.history.map((entry, idx) => (
                    <div key={idx} className="text-xs bg-[#161b22] p-2.5 rounded-lg border border-[#21262d] flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-blue-400 font-mono">{entry.action}</span>
                        <span className="text-gray-500 font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-gray-300 text-[11px] leading-relaxed">{entry.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
