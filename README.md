# Autonomous Customer Resolution Agent

**Track 3: Smart Automation — Problem Statement 5**
Frontend Dashboard, Backend Enterprise Tools & Integration API for an Autonomous Customer Resolution Agent.

An AI agent that resolves customer support cases (refunds, replacements, cancellations) by calling real backend tools — checking policy, checking inventory, and honestly reporting failures instead of hallucinating success — then replanning when its first approach doesn't work.

---

## ⚠️ Deployment & Persistence Notice

- **Runtime status:** Demo Mode with in-memory state.
- **Persistence behavior:** State mutations (refunds, cancellations, replacements) are held in-memory and reset on serverless container restarts (e.g. on Vercel).
- **Repeatable testing:** Use the `/api/tools/reset` endpoint or the **"Reset World State"** sidebar button to restore the initial seed data instantly.
- **Production persistence:** For a persistent multi-tenant PostgreSQL/Supabase deployment, see the schema and migration guide in [`docs/DATABASE_SETUP.md`](docs/DATABASE_SETUP.md).

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Customer Resolution Dashboard               │
│   • Customer Support Chat (Preset Scenarios, Loading)    │
│   • Agent Execution Trace (Decision, Tools, Replanning)  │
│   • Case State Panel (Customer Tier, Order, Inventory)   │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│              Next.js 15 Backend API Routes               │
│   • /api/tools/customer       • /api/tools/order         │
│   • /api/tools/inventory      • /api/tools/policy        │
│   • /api/tools/refund         • /api/tools/replacement   │
│   • /api/tools/cancel         • /api/tools/verify        │
│   • /api/tools/reset          • /api/case                │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│            Enterprise Tools Simulation Engine             │
│   • Strict Policy Validation (30-day Window, Limits)     │
│   • Honest Failure Reporting (No Fake Successes)         │
│   • Duplicate Action Prevention                          │
│   • Audit Logging & State Verification                   │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│            Simulated Datasets (Deterministic)             │
│   • Customers (VIP, Standard)                             │
│   • Orders (ORD-5001 to ORD-5005)                          │
│   • Inventory (SKU-SMARTWATCH-PRO-SLV planted 0 stock)     │
│   • Company Policies (Return, Refund, Cancel, Escalate)     │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Backend Tools

All tools live in `src/lib/tools.ts` and are exposed via Next.js Route Handlers:

| Tool | Description |
|---|---|
| `get_customer(customer_id)` | Customer profile, contact, VIP tier, and past order IDs. |
| `get_order(order_id)` | Line items, amounts, shipping address, status, and event audit history. |
| `get_customer_orders(customer_id)` | Helper retrieving all orders for a customer. |
| `check_inventory(sku)` | Real-time SKU stock count and restock dates. |
| `check_policy(order_id, action)` | Business rules engine for `REFUND`, `REPLACEMENT`, and `CANCEL`. |
| `process_refund(order_id, amount)` | Processes refund with automatic 10% VIP bonus credit. |
| `process_replacement(order_id, sku)` | Deducts inventory and issues replacement. Fails honestly if out of stock. |
| `cancel_order(order_id)` | Cancels pre-shipment orders with automatic refund. |
| `verify_state(order_id)` | Verifies final order status, resolution state, and audit entries. |
| `reset_world()` | Deterministic seed-state reset. |

---

## 🎯 Mandatory Failure Scenario

The mandatory out-of-stock replanning workflow uses:

- **Order ID:** `ORD-5004` (Delivered item: SmartWatch Pro Silver, $249.99)
- **SKU:** `SKU-SMARTWATCH-PRO-SLV`
- **Quantity in stock:** 0
- **Restock date:** `2026-10-15T00:00:00Z`

### 9-Step Verification Flow

1. **Retrieve Customer & Order** — Customer `CUST-1001` (Alice Smith, VIP) and order `ORD-5004` are retrieved.
2. **Check Replacement Eligibility** — `check_policy("ORD-5004", "REPLACEMENT")` confirms the order is within the 30-day window.
3. **Check Inventory** — `check_inventory("SKU-SMARTWATCH-PRO-SLV")` returns `in_stock: false, quantity_available: 0, restock_date: "2026-10-15"`.
4. **Attempt Replacement** — `process_replacement("ORD-5004", "SKU-SMARTWATCH-PRO-SLV")` is called.
5. **Honest Failure Returned** — System returns a structured failure: *"Replacement failed: SKU 'SKU-SMARTWATCH-PRO-SLV' (SmartWatch Pro (Silver)) is out of stock (quantity: 0). Order state is not modified."*
6. **Agent Inspects Failure** — UI and trace log show the failure distinctly in red with the tool payload.
7. **Agent Replans Alternative** — Agent evaluates the alternative resolution (full refund of $249.99 + 10% VIP bonus credit).
8. **Execute Permitted Alternative** — `process_refund("ORD-5004")` is executed successfully.
9. **State Verification** — `verify_state("ORD-5004")` confirms `resolution_state: REFUND_PROCESSED`.

---

## 🤖 Agent Execution Modes

The sidebar has an **Agent Execution Mode** toggle with three states:

- **🧪 Mock Mode** — Uses an internal deterministic simulator (`src/lib/mockAgent.ts`, served via `src/app/api/agent/mock/route.ts`). Exercises the real backend tools and emits realistic chronological trace events for UI verification, without calling any external LLM. Clearly tagged `[MOCK SIMULATION]` across all panels.
- **⚡ Groq AI Active** — Routes requests through `src/lib/groqAgent.ts`, which calls the Groq API directly with tool-calling enabled against the backend tools above. Live model reasoning, live trace events, live state mutations.
- **Offline / Live external agent** — If `NEXT_PUBLIC_AGENT_API_URL` is set, requests instead go through `src/lib/agentAdapter.ts` to an external agent orchestration service (see API contract below), instead of calling Groq directly.

The sidebar shows **"Groq Active"** or **"Offline Mock"** depending on whether `GROQ_API_KEY` is configured on the server.

---

## 🧠 Model Configuration

Default model: **`llama-3.3-70b-versatile`** (set via `GROQ_MODEL` in your `.env.local`; override to any Groq-hosted tool-calling model, e.g. `openai/gpt-oss-120b`).

If you swap in a reasoning model such as `openai/gpt-oss-120b`, note that it behaves differently from Llama and needs its own tuning:

- Groq's recommended sampling for `gpt-oss-120b` is `temperature: 1.0, top_p: 1` (not the low temperature that suits Llama).
- Set `reasoning_effort` (`'low'` / `'medium'` / `'high'`) and `reasoning_format: 'hidden'` so the model's internal chain-of-thought doesn't leak into `message.content`.
- Free-tier rate limits differ per model — check [console.groq.com/settings/limits](https://console.groq.com/settings/limits). `gpt-oss-120b` on the free plan is capped at 30 RPM / 1,000 RPD / **8K TPM** / 200K TPD, which is tight for a multi-step tool-calling conversation; handle `429` responses with a retry/backoff rather than letting the run fail mid-resolution.

---

## 🔌 API Contract for External Agent Integration

If you're routing through an external agent orchestration service instead of calling Groq directly, refer to [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) for the full contract.

**What the external service needs to provide:**
- An endpoint: `POST {AGENT_URL}/resolve`
- Accepting: `{ case_id, customer_id, order_id, message }`
- Returning: `{ trace: TraceEvent[], response: string }`
- Set the URL via `NEXT_PUBLIC_AGENT_API_URL`

> **Security note:** `NEXT_PUBLIC_`-prefixed variables are bundled into client-side JavaScript by Next.js and are visible to anyone who opens dev tools on the deployed site. Only ever put a plain URL in `NEXT_PUBLIC_AGENT_API_URL` — never an API key or secret. Server-only secrets (like `GROQ_API_KEY`) must never use the `NEXT_PUBLIC_` prefix.

---

## 🖥️ What the Website Does

The dashboard is a live workbench for watching an AI agent resolve customer support cases end-to-end — not just chat with a bot, but actually call backend tools, hit real (simulated) business rules, and show its work.

**Chat with the agent** — Type a customer support request, or load one of four built-in demo scenarios from the sidebar:

| Scenario | What happens |
|---|---|
| ✅ **Successful Refund** | VIP customer requests a refund for defective earbuds within the 30-day window → refund processed with automatic VIP bonus. |
| 🚫 **Successful Cancellation** | Customer cancels an order still in `PENDING` status before it ships → order cancelled cleanly. |
| ⚠️ **Out-of-Stock Replacement** (mandatory scenario) | Customer requests a replacement for an item with 0 stock → replacement is honestly blocked, the agent replans, and falls back to a refund instead. |
| 🔒 **Policy-Blocked Escalation** | Customer tries to cancel an already-delivered order → policy blocks it and the case escalates to a human agent instead of faking a resolution. |

You can also just type your own message — the agent will look up the currently selected customer/order and act on it.

**Watch the Agent Execution Trace** — Every tool call the agent makes (customer lookup, order lookup, policy check, inventory check, refund/replacement/cancel, state verification) streams into a live trace panel in order, including failures shown distinctly in red — so you can see *why* the agent made the decision it did, not just the final answer.

**See live case state** — The sidebar's state panel shows the customer's tier, the order's current status, and inventory levels, updating in real time as the agent's tool calls actually mutate that state.

**Switch agent modes** — Toggle between **🧪 Mock Mode** (deterministic local simulation, no LLM calls, good for demoing the flow offline) and **⚡ Groq AI Active** (real LLM reasoning and tool-calling against the backend).

**Reset anytime** — The "Reset World State" button restores all customers/orders/inventory back to their seeded starting values, so any scenario can be replayed from scratch.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Add your Groq API key to .env.local
#    (get one at https://console.groq.com/keys)
#    GROQ_API_KEY=your_key_here

# 4. Run automated test suite
npm test

# 5. Run Next.js production build
npm run build

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | For Groq mode | Server-only. Never exposed to the browser. Get one at [console.groq.com](https://console.groq.com). |
| `GROQ_MODEL` | No | Defaults to `llama-3.3-70b-versatile`. |
| `NEXT_PUBLIC_AGENT_API_URL` | No | URL of an external agent service, if not using Groq directly. Must be a plain URL — never a secret. |
| `DATABASE_URL` | No | Optional Postgres/Supabase connection string for persistent state. See `docs/DATABASE_SETUP.md`. |
| `NODE_ENV` | No | `development` / `production`. |

---

## 🧪 Automated Testing

```bash
npm test
```

**Verified test coverage:**
- `get_customer` — Valid profiles, VIP tiers, invalid customer handling
- `get_order` — Order retrieval, line items, invalid order IDs
- `check_inventory` — Available stock, out-of-stock reporting (`SKU-SMARTWATCH-PRO-SLV`), restock dates
- `check_policy` — 30-day refund window, cancellation status validation, replacement rules
- `process_refund` — Refund execution, VIP bonus credit, duplicate prevention
- `cancel_order` — Cancellation of pending orders, policy blocking of delivered orders, duplicate prevention
- `process_replacement` — In-stock replacement, honest out-of-stock failure, duplicate prevention
- `verify_state` — Pre-action vs. post-action state verification
- **Mandatory E2E workflow** — Full 9-step failure → replanning → alternative refund → state verification on `ORD-5004`
- `groqAgent` — Tool-calling loop, tool-sequence handling, response parsing

---

## 🌐 Live Deployment

This project is deployed on Vercel.

- **Dashboard:** [https://autonomous-os.vercel.app/](https://autonomous-os.vercel.app/)

Environment variables configured on Vercel:

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Server-only, powers Groq AI Active mode. |
| `GROQ_MODEL` | Defaults to `llama-3.3-70b-versatile` if unset. |
| `NEXT_PUBLIC_AGENT_API_URL` | Only needed if routing through an external agent service instead of Groq directly — must be a plain URL, never a key. |
