// ============================================================
// Comprehensive Tests for Agent Reliability, Tool Validation,
// and Intent-Aware Customer Resolution Behavior
// ============================================================

import { GROQ_TOOLS, runGroqAgent, validateToolCall, executeTool, SYSTEM_PROMPT } from '@/lib/groqAgent';
import { detectMockIntent, runMockSimulation } from '@/lib/mockAgent';
import { resetWorld, getOrder } from '@/lib/tools';

beforeEach(() => {
  resetWorld();
});

describe('Groq Agent Tool Definitions & Schema', () => {
  it('should define all 8 required backend tools for function calling', () => {
    const toolNames = GROQ_TOOLS.map((t) => t.function.name);
    expect(toolNames).toContain('get_customer');
    expect(toolNames).toContain('get_order');
    expect(toolNames).toContain('check_inventory');
    expect(toolNames).toContain('check_policy');
    expect(toolNames).toContain('process_refund');
    expect(toolNames).toContain('process_replacement');
    expect(toolNames).toContain('cancel_order');
    expect(toolNames).toContain('verify_state');
  });

  it('should require customer_id for get_customer', () => {
    const tool = GROQ_TOOLS.find((t) => t.function.name === 'get_customer');
    expect(tool).toBeDefined();
    expect(tool?.function.parameters?.required).toContain('customer_id');
  });

  it('should require order_id and action for check_policy', () => {
    const tool = GROQ_TOOLS.find((t) => t.function.name === 'check_policy');
    expect(tool).toBeDefined();
    expect(tool?.function.parameters?.required).toEqual(
      expect.arrayContaining(['order_id', 'action'])
    );
  });

  it('should include clear system instructions for intent, scope, and verification', () => {
    expect(SYSTEM_PROMPT).toContain('INTENT RECOGNITION & SCOPE BOUNDARIES');
    expect(SYSTEM_PROMPT).toContain('Tell me a joke');
    expect(SYSTEM_PROMPT).toContain('Where is my order?');
    expect(SYSTEM_PROMPT).toContain('verify_state');
  });

  it('should fail cleanly with helpful message when GROQ_API_KEY is not set', async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    await expect(
      runGroqAgent({
        customerId: 'CUST-1001',
        orderId: 'ORD-5001',
        message: 'I want a refund',
      })
    ).rejects.toThrow('GROQ_API_KEY environment variable is not configured');

    process.env.GROQ_API_KEY = originalKey;
  });
});

describe('Tool Argument Validation (validateToolCall)', () => {
  it('should validate get_customer arguments', () => {
    expect(validateToolCall('get_customer', { customer_id: 'CUST-1001' }).valid).toBe(true);
    expect(validateToolCall('get_customer', { customer_id: '' }).valid).toBe(false);
    expect(validateToolCall('get_customer', {}).valid).toBe(false);
  });

  it('should validate get_order arguments', () => {
    expect(validateToolCall('get_order', { order_id: 'ORD-5001' }).valid).toBe(true);
    expect(validateToolCall('get_order', { order_id: '' }).valid).toBe(false);
    expect(validateToolCall('get_order', {}).valid).toBe(false);
  });

  it('should validate check_inventory arguments', () => {
    expect(validateToolCall('check_inventory', { sku: 'SKU-SMARTWATCH-PRO-SLV' }).valid).toBe(true);
    expect(validateToolCall('check_inventory', { sku: '' }).valid).toBe(false);
  });

  it('should validate check_policy action whitelist', () => {
    expect(validateToolCall('check_policy', { order_id: 'ORD-5001', action: 'REFUND' }).valid).toBe(true);
    expect(validateToolCall('check_policy', { order_id: 'ORD-5001', action: 'REPLACEMENT' }).valid).toBe(true);
    expect(validateToolCall('check_policy', { order_id: 'ORD-5001', action: 'CANCEL' }).valid).toBe(true);
    expect(validateToolCall('check_policy', { order_id: 'ORD-5001', action: 'INVALID_ACTION' }).valid).toBe(false);
    expect(validateToolCall('check_policy', { order_id: '', action: 'REFUND' }).valid).toBe(false);
  });

  it('should validate process_refund optional amount', () => {
    expect(validateToolCall('process_refund', { order_id: 'ORD-5001' }).valid).toBe(true);
    expect(validateToolCall('process_refund', { order_id: 'ORD-5001', amount: 50 }).valid).toBe(true);
    expect(validateToolCall('process_refund', { order_id: 'ORD-5001', amount: -10 }).valid).toBe(false);
    expect(validateToolCall('process_refund', { order_id: 'ORD-5001', amount: 'abc' }).valid).toBe(false);
  });

  it('should validate process_replacement required sku', () => {
    expect(validateToolCall('process_replacement', { order_id: 'ORD-5004', sku: 'SKU-SMARTWATCH-PRO-SLV' }).valid).toBe(true);
    expect(validateToolCall('process_replacement', { order_id: 'ORD-5004', sku: '' }).valid).toBe(false);
  });

  it('should reject unknown tool names', () => {
    expect(validateToolCall('unknown_magic_tool', {}).valid).toBe(false);
  });
});

describe('Tool Execution Engine (executeTool)', () => {
  it('should execute valid backend tool call successfully', () => {
    const result = executeTool('get_customer', { customer_id: 'CUST-1001' });
    expect(result.success).toBe(true);
    expect((result.customer as { name: string })?.name).toBe('Alice Smith');
  });

  it('should return clean structured error when arguments are missing or invalid', () => {
    const result = executeTool('get_order', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter');
  });

  it('should report honest stock failure on out-of-stock SKU', () => {
    const result = executeTool('check_inventory', { sku: 'SKU-SMARTWATCH-PRO-SLV' });
    expect(result.success).toBe(true);
    expect(result.in_stock).toBe(false);
    expect(result.quantity_available).toBe(0);
    expect(result.restock_date).toBe('2026-10-15T00:00:00Z');
  });
});

describe('Intent Detection & Classification', () => {
  it('should classify "Where is my order?" as order-status', () => {
    expect(detectMockIntent('Where is my order?')).toBe('order-status');
    expect(detectMockIntent('Can you track my order ORD-5001?')).toBe('order-status');
  });

  it('should classify "Cancel my delivered order" as policy-blocked', () => {
    expect(detectMockIntent('Cancel my delivered order')).toBe('policy-blocked');
  });

  it('should classify "Replace my out-of-stock item" as oos-replacement', () => {
    expect(detectMockIntent('Replace my out-of-stock item')).toBe('oos-replacement');
    expect(detectMockIntent('I need a replacement for my smartwatch')).toBe('oos-replacement');
  });

  it('should classify "Tell me a joke" as off-topic', () => {
    expect(detectMockIntent('Tell me a joke')).toBe('off-topic');
    expect(detectMockIntent('Can you tell a funny story?')).toBe('off-topic');
  });

  it('should classify vague single-word messages as unclear', () => {
    expect(detectMockIntent('help')).toBe('unclear');
    expect(detectMockIntent('hello')).toBe('unclear');
    expect(detectMockIntent('idk')).toBe('unclear');
  });

  it('should classify tool failure requests as tool-failure', () => {
    expect(detectMockIntent('simulate tool failure')).toBe('tool-failure');
  });
});

describe('Required Customer Support Behaviors (End-to-End Simulation)', () => {
  // 1. "Where is my order?"
  it('Scenario 1: "Where is my order?" looks up order without performing mutating actions', () => {
    const data = runMockSimulation({
      customer_id: 'CUST-1001',
      order_id: 'ORD-5001',
      message: 'Where is my order?',
    });

    expect(data.response).toContain('ORD-5001');
    expect(data.response).toContain('Status');

    // Verify tools called were read-only
    const toolEvents = data.trace.filter((e) => e.type === 'tool_called');
    const calledTools = toolEvents.map((e) => e.tool_name);
    expect(calledTools).toContain('get_order');
    expect(calledTools).not.toContain('process_refund');
    expect(calledTools).not.toContain('cancel_order');

    // Confirm backend state remains un-mutated
    const orderCheck = getOrder('ORD-5001');
    expect((orderCheck.order as { resolution_state: string }).resolution_state).toBe('NONE');
  });

  // 2. "Cancel my delivered order"
  it('Scenario 2: "Cancel my delivered order" checks policy and blocks cancellation honestly', () => {
    const data = runMockSimulation({
      customer_id: 'CUST-1002',
      order_id: 'ORD-5002',
      message: 'Cancel my delivered order ORD-5002',
    });

    expect(data.response).toContain('DELIVERED');
    expect(data.response).toContain('cannot cancel');

    // Verify trace logged policy block and escalation
    const failedEvents = data.trace.filter((e) => e.type === 'action_failed');
    expect(failedEvents.length).toBeGreaterThan(0);
    expect(failedEvents[0].description).toContain('Cancellation BLOCKED');

    const escalationEvents = data.trace.filter((e) => e.type === 'escalation');
    expect(escalationEvents.length).toBe(1);

    // Verify order was NOT cancelled
    const orderCheck = getOrder('ORD-5002');
    expect((orderCheck.order as { status: string }).status).toBe('DELIVERED');
  });

  // 3. "Replace my out-of-stock item"
  it('Scenario 3: "Replace my out-of-stock item" handles stockout failure honestly and replans to refund', () => {
    const data = runMockSimulation({
      customer_id: 'CUST-1001',
      order_id: 'ORD-5004',
      message: 'Replace my out-of-stock item on order ORD-5004',
    });

    expect(data.response).toContain('out of stock');
    expect(data.response).toContain('October 15, 2026');
    expect(data.response).toContain('refund');

    // Check trace for honest failure and replanning
    const replanningEvents = data.trace.filter((e) => e.type === 'replanning');
    expect(replanningEvents.length).toBe(1);
    expect(replanningEvents[0].description).toContain('REPLANNING TRIGGERED');

    // Check post-action verification
    const verifyEvents = data.trace.filter((e) => e.type === 'state_verification');
    expect(verifyEvents.length).toBe(1);

    // Order state was verified as refunded
    const finalOrder = getOrder('ORD-5004');
    expect((finalOrder.order as { resolution_state: string }).resolution_state).toBe('REFUND_PROCESSED');
  });

  // 4. "Tell me a joke"
  it('Scenario 4: "Tell me a joke" politely explains customer support scope without calling tools', () => {
    const data = runMockSimulation({
      customer_id: 'CUST-1001',
      order_id: 'ORD-5001',
      message: 'Tell me a joke please',
    });

    expect(data.response).toContain('customer resolution assistant');
    expect(data.response).toContain('unable to assist with jokes');

    // Zero backend tools should be invoked
    const toolEvents = data.trace.filter((e) => e.type === 'tool_called');
    expect(toolEvents.length).toBe(0);

    // Order state was not modified
    const orderCheck = getOrder('ORD-5001');
    expect((orderCheck.order as { resolution_state: string }).resolution_state).toBe('NONE');
  });

  // 5. An unclear message
  it('Scenario 5: Unclear message asks for clarification before performing actions', () => {
    const data = runMockSimulation({
      customer_id: 'CUST-1001',
      order_id: 'ORD-5001',
      message: 'help',
    });

    expect(data.response).toContain('clarify');
    expect(data.response).toContain('ORD-5001');

    // Zero backend tools should be invoked for vague input
    const toolEvents = data.trace.filter((e) => e.type === 'tool_called');
    expect(toolEvents.length).toBe(0);
  });

  // 6. Backend/tool failure
  it('Scenario 6: Backend/tool failure is reported honestly without fabricating success', () => {
    const data = runMockSimulation({
      customer_id: 'CUST-1001',
      order_id: 'ORD-5001',
      message: 'simulate backend failure',
    });

    expect(data.response).toContain('encountered an issue');
    expect(data.response).toContain('not found');

    // Trace contains action_failed
    const failedEvents = data.trace.filter((e) => e.type === 'action_failed');
    expect(failedEvents.length).toBe(1);
    expect(failedEvents[0].status).toBe('failure');
  });
});
