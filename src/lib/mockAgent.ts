// ============================================================
// Mock Agent Engine (Developer Simulation Stub)
// Simulates the AI agent's reasoning, tool calling, intent detection,
// and replanning for development and hackathon demonstration.
// ============================================================

import {
  getCustomer,
  getOrder,
  checkInventory,
  checkPolicy,
  processRefund,
  processReplacement,
  cancelOrder,
  verifyState,
} from '@/lib/tools';
import { updateCase } from '@/lib/cases';
import { TraceEvent, Case } from '@/lib/types';

function ts(): string {
  return new Date().toISOString();
}

function buildTrace(events: Omit<TraceEvent, 'step'>[]): TraceEvent[] {
  return events.map((e, i) => ({
    ...e,
    step: i + 1,
    metadata: {
      ...e.metadata,
      is_mock: true,
      mode: 'mock_simulation',
      note: 'Simulated developer trace event for frontend verification',
    },
  }));
}

// ---- Intent Classification Helper ----

export function detectMockIntent(message?: string, scenarioId?: string): string {
  const text = (message || '').trim().toLowerCase();

  if (!text && scenarioId) {
    return scenarioId;
  }

  // 1. Off-topic / Unrelated check
  const offTopicKeywords = [
    'joke', 'funny', 'riddle', 'weather', 'poem', 'story', 'song',
    'who are you', 'what is your name', 'capital of', 'recipe', 'movie', 'game', 'sing'
  ];
  if (offTopicKeywords.some((kw) => text.includes(kw))) {
    return 'off-topic';
  }

  // 2. Unclear / Ambiguous check
  const unclearWords = ['help', 'hello', 'hi', 'hey', 'test', 'problem', 'broken', 'issue', 'support', 'idk'];
  if (text.length < 10 && unclearWords.includes(text)) {
    return 'unclear';
  }
  if (text.length <= 4) {
    return 'unclear';
  }

  // 3. Backend / Tool failure simulation check
  if (
    text.includes('tool failure') ||
    text.includes('backend failure') ||
    text.includes('simulate failure') ||
    text.includes('system failure')
  ) {
    return 'tool-failure';
  }

  // 4. Order status inquiry ("Where is my order?")
  const statusKeywords = [
    'where is my order', 'where is order', 'where is my package',
    'track my order', 'order status', 'status of my order', 'has my order shipped',
    'when will my order arrive', 'delivery status', 'tracking status', 'where is it'
  ];
  if (statusKeywords.some((kw) => text.includes(kw))) {
    return 'order-status';
  }

  // 5. Cancel delivered order (Policy blocked)
  if (
    (text.includes('cancel') && (text.includes('delivered') || text.includes('5001') || text.includes('5002') || text.includes('5004'))) ||
    scenarioId === 'policy-blocked'
  ) {
    return 'policy-blocked';
  }

  // 6. Out-of-Stock Replacement
  if (
    (text.includes('replace') || text.includes('replacement') || text.includes('swap') || text.includes('exchange')) &&
    (text.includes('out of stock') || text.includes('stock') || text.includes('smartwatch') || text.includes('silver') || text.includes('5004') || scenarioId === 'oos-replacement')
  ) {
    return 'oos-replacement';
  }

  // 7. General cancellation (e.g. on pending/processing order ORD-5003)
  if (text.includes('cancel') || scenarioId === 'cancellation') {
    return 'cancellation';
  }

  // 8. Refund requests
  if (text.includes('refund') || text.includes('money back') || text.includes('return') || scenarioId === 'refund') {
    return 'refund';
  }

  // 9. Replacement requests (general)
  if (text.includes('replace') || text.includes('replacement')) {
    return 'oos-replacement';
  }

  // 10. Fallback to scenario ID if present
  if (scenarioId === 'oos-replacement') return 'oos-replacement';
  if (scenarioId === 'cancellation') return 'cancellation';
  if (scenarioId === 'policy-blocked') return 'policy-blocked';
  if (scenarioId === 'refund') return 'refund';

  return 'unclear';
}

// ---- Scenario Handlers ----

export function handleOffTopicScenario(message: string) {
  const trace: Omit<TraceEvent, 'step'>[] = [];

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Customer input evaluated ("${message}"). Intent identified as off-topic or unrelated to e-commerce customer support. Explaining service scope.`,
    status: 'info',
    timestamp: ts(),
  });

  trace.push({
    type: 'final_resolution',
    description: `[MOCK AGENT] Request handled within scope boundaries without executing order mutations or tools.`,
    status: 'info',
    timestamp: ts(),
  });

  return {
    trace: buildTrace(trace),
    response: `I am an autonomous customer resolution assistant dedicated to helping with order tracking, refunds, replacements, cancellations, and store policies.\n\nI'm unable to assist with jokes or off-topic questions, but please let me know if you need any help with your orders, products, or account!`,
    status: 'open' as const,
  };
}

export function handleUnclearScenario(orderId: string, message: string) {
  const trace: Omit<TraceEvent, 'step'>[] = [];

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Customer input evaluated ("${message}"). Request lacks necessary details or specific intent. Asking clarifying question before taking action.`,
    status: 'info',
    timestamp: ts(),
  });

  trace.push({
    type: 'final_resolution',
    description: `[MOCK AGENT] Clarification requested from customer. No state mutations performed.`,
    status: 'info',
    timestamp: ts(),
  });

  return {
    trace: buildTrace(trace),
    response: `Hello! I'm here to assist you with your orders and support requests.\n\nCould you please clarify what specific assistance you need regarding order **${orderId}**? For example, I can help you check its delivery status, request a refund, arrange a replacement, or review cancellation options.`,
    status: 'open' as const,
  };
}

export function handleOrderStatusScenario(customerId: string, orderId: string) {
  const trace: Omit<TraceEvent, 'step'>[] = [];
  const targetOrderId = orderId || 'ORD-5001';
  const targetCustomerId = customerId || 'CUST-1001';

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Intent identified: Customer is inquiring about order status for ${targetOrderId}. Looking up customer and order details without performing mutating actions.`,
    status: 'info',
    timestamp: ts(),
  });

  const custResult = getCustomer(targetCustomerId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_customer("${targetCustomerId}")`,
    status: custResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_customer',
    tool_input: { customer_id: targetCustomerId },
    tool_output: custResult as Record<string, unknown>,
  });

  const orderResult = getOrder(targetOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_order("${targetOrderId}")`,
    status: orderResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_order',
    tool_input: { order_id: targetOrderId },
    tool_output: orderResult as Record<string, unknown>,
  });

  const verifyResult = verifyState(targetOrderId);
  trace.push({
    type: 'state_verification',
    description: `[MOCK AGENT] Calling verify_state("${targetOrderId}") -> status: ${verifyResult.status}, resolution_state: ${verifyResult.resolution_state}`,
    status: 'success',
    timestamp: ts(),
    tool_name: 'verify_state',
    tool_input: { order_id: targetOrderId },
    tool_output: verifyResult as Record<string, unknown>,
  });

  trace.push({
    type: 'final_resolution',
    description: `[MOCK AGENT] Order status retrieved and presented to customer. No mutations performed.`,
    status: 'success',
    timestamp: ts(),
  });

  const order = orderResult.order as {
    order_id: string;
    status: string;
    order_date: string;
    delivery_date: string | null;
    shipping_address: string;
    total_amount: number;
    resolution_state: string;
    items: Array<{ item_name: string; quantity: number }>;
  } | undefined;

  if (!order) {
    return {
      trace: buildTrace(trace),
      response: `I looked up your order **${targetOrderId}**, but could not find matching records in our system. Please double check the order number.`,
      status: 'failed' as const,
    };
  }

  return {
    trace: buildTrace(trace),
    response: `Here is the current status of your order **${order.order_id}**:\n\n• **Status**: ${order.status}\n• **Order Date**: ${new Date(order.order_date).toLocaleDateString()}\n• **Delivery Date**: ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'In transit'}\n• **Shipping Address**: ${order.shipping_address}\n• **Items**: ${order.items.map((i) => `${i.item_name} (Qty: ${i.quantity})`).join(', ')}\n• **Total Amount**: $${order.total_amount.toFixed(2)}\n• **Resolution State**: ${order.resolution_state}\n\nPlease let me know if you have any questions or need further assistance with this order!`,
    status: 'resolved' as const,
  };
}

export function handleToolFailureScenario(customerId: string, orderId: string) {
  const trace: Omit<TraceEvent, 'step'>[] = [];
  const invalidOrderId = 'ORD-NONEXISTENT';

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Simulating backend tool failure with non-existent order ${invalidOrderId}.`,
    status: 'info',
    timestamp: ts(),
  });

  const orderResult = getOrder(invalidOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_order("${invalidOrderId}")`,
    status: 'failure',
    timestamp: ts(),
    tool_name: 'get_order',
    tool_input: { order_id: invalidOrderId },
    tool_output: orderResult as Record<string, unknown>,
  });

  trace.push({
    type: 'action_failed',
    description: `[MOCK AGENT] Tool get_order failed honestly: ${orderResult.error}`,
    status: 'failure',
    timestamp: ts(),
    tool_name: 'get_order',
    tool_output: orderResult as Record<string, unknown>,
  });

  trace.push({
    type: 'final_resolution',
    description: `[MOCK AGENT] Backend tool failure reported honestly to user without fabricating results.`,
    status: 'failure',
    timestamp: ts(),
  });

  return {
    trace: buildTrace(trace),
    response: `I encountered an issue looking up records from our backend system: **${orderResult.error}**.\n\nPlease verify your order identifier and try again, or reach out to our human support team if you believe this is in error.`,
    status: 'failed' as const,
  };
}

export function handleRefundScenario(customerId: string, orderId: string) {
  const trace: Omit<TraceEvent, 'step'>[] = [];
  const targetOrderId = orderId || 'ORD-5001';
  const targetCustomerId = customerId || 'CUST-1001';

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Customer requests a refund for order ${targetOrderId}. Step 1: Look up customer profile and order details.`,
    status: 'info',
    timestamp: ts(),
  });

  const custResult = getCustomer(targetCustomerId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_customer("${targetCustomerId}")`,
    status: custResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_customer',
    tool_input: { customer_id: targetCustomerId },
    tool_output: custResult as Record<string, unknown>,
  });

  const orderResult = getOrder(targetOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_order("${targetOrderId}")`,
    status: orderResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_order',
    tool_input: { order_id: targetOrderId },
    tool_output: orderResult as Record<string, unknown>,
  });

  const policyResult = checkPolicy(targetOrderId, 'REFUND');
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling check_policy("${targetOrderId}", "REFUND")`,
    status: policyResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'check_policy',
    tool_input: { order_id: targetOrderId, action: 'REFUND' },
    tool_output: policyResult as Record<string, unknown>,
  });

  if (!policyResult.success) {
    trace.push({
      type: 'action_failed',
      description: `[MOCK AGENT] Refund blocked by policy: ${policyResult.error}`,
      status: 'failure',
      timestamp: ts(),
    });
    return {
      trace: buildTrace(trace),
      response: `I'm sorry, but your refund cannot be processed under company policy: ${policyResult.error}`,
      status: 'failed' as const,
    };
  }

  const refundResult = processRefund(targetOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling process_refund("${targetOrderId}")`,
    status: refundResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'process_refund',
    tool_input: { order_id: targetOrderId },
    tool_output: refundResult as Record<string, unknown>,
  });

  trace.push({
    type: 'action_completed',
    description: `[MOCK AGENT] Refund completed: ${refundResult.message}`,
    status: 'success',
    timestamp: ts(),
  });

  const verifyResult = verifyState(targetOrderId);
  trace.push({
    type: 'state_verification',
    description: `[MOCK AGENT] Calling verify_state("${targetOrderId}") -> resolution_state: ${verifyResult.resolution_state}, is_resolved: ${verifyResult.is_resolved}`,
    status: 'success',
    timestamp: ts(),
    tool_name: 'verify_state',
    tool_input: { order_id: targetOrderId },
    tool_output: verifyResult as Record<string, unknown>,
  });

  trace.push({
    type: 'final_resolution',
    description: `[MOCK AGENT] Full refund of $${refundResult.refund_amount} successfully processed.${
      refundResult.vip_bonus_credit ? ` VIP bonus credit: $${refundResult.vip_bonus_credit}.` : ''
    }`,
    status: 'success',
    timestamp: ts(),
  });

  return {
    trace: buildTrace(trace),
    response: `Your refund has been successfully processed!\n\n• **Order ID**: ${targetOrderId}\n• **Refund Amount**: $${refundResult.refund_amount}\n${
      refundResult.vip_bonus_credit
        ? `• **VIP Bonus Credit**: $${refundResult.vip_bonus_credit} (10% VIP perk)\n• **Total Credited**: $${refundResult.total_credited}\n`
        : ''
    }• **Payment Method**: ${refundResult.payment_method}\n\nPlease allow 3-5 business days for the funds to reflect in your account.`,
    status: 'resolved' as const,
  };
}

export function handleCancellationScenario(customerId: string, orderId: string) {
  const trace: Omit<TraceEvent, 'step'>[] = [];
  const targetOrderId = orderId || 'ORD-5003';
  const targetCustomerId = customerId || 'CUST-1003';

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Customer requested order cancellation for ${targetOrderId}. Step 1: Verify customer profile and order status.`,
    status: 'info',
    timestamp: ts(),
  });

  const custResult = getCustomer(targetCustomerId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_customer("${targetCustomerId}")`,
    status: custResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_customer',
    tool_input: { customer_id: targetCustomerId },
    tool_output: custResult as Record<string, unknown>,
  });

  const orderResult = getOrder(targetOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_order("${targetOrderId}")`,
    status: orderResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_order',
    tool_input: { order_id: targetOrderId },
    tool_output: orderResult as Record<string, unknown>,
  });

  const policyResult = checkPolicy(targetOrderId, 'CANCEL');
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling check_policy("${targetOrderId}", "CANCEL")`,
    status: policyResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'check_policy',
    tool_input: { order_id: targetOrderId, action: 'CANCEL' },
    tool_output: policyResult as Record<string, unknown>,
  });

  if (!policyResult.success) {
    trace.push({
      type: 'action_failed',
      description: `[MOCK AGENT] Cancellation blocked: ${policyResult.error}`,
      status: 'failure',
      timestamp: ts(),
    });
    return {
      trace: buildTrace(trace),
      response: `I cannot cancel this order: ${policyResult.error}`,
      status: 'failed' as const,
    };
  }

  const cancelResult = cancelOrder(targetOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling cancel_order("${targetOrderId}")`,
    status: cancelResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'cancel_order',
    tool_input: { order_id: targetOrderId },
    tool_output: cancelResult as Record<string, unknown>,
  });

  trace.push({
    type: 'action_completed',
    description: `[MOCK AGENT] Cancellation completed: ${cancelResult.message}`,
    status: 'success',
    timestamp: ts(),
  });

  const verifyResult = verifyState(targetOrderId);
  trace.push({
    type: 'state_verification',
    description: `[MOCK AGENT] Calling verify_state("${targetOrderId}") -> status: ${verifyResult.status}, resolution_state: ${verifyResult.resolution_state}`,
    status: 'success',
    timestamp: ts(),
    tool_name: 'verify_state',
    tool_input: { order_id: targetOrderId },
    tool_output: verifyResult as Record<string, unknown>,
  });

  trace.push({
    type: 'final_resolution',
    description: `[MOCK AGENT] Order ${targetOrderId} cancelled before shipment. Full refund of $${cancelResult.refund_amount} processed.`,
    status: 'success',
    timestamp: ts(),
  });

  return {
    trace: buildTrace(trace),
    response: `Your order **${targetOrderId}** has been successfully cancelled!\n\n• **Order ID**: ${targetOrderId}\n• **Status**: CANCELLED\n• **Refund Amount**: $${cancelResult.refund_amount}\n• **Credited to**: ${cancelResult.payment_method}\n\nYour refund will be returned to your original payment method.`,
    status: 'resolved' as const,
  };
}

export function handleOosReplacementScenario(customerId: string, orderId: string) {
  const trace: Omit<TraceEvent, 'step'>[] = [];
  const targetOrderId = orderId || 'ORD-5004';
  const targetCustomerId = customerId || 'CUST-1001';
  const targetSku = 'SKU-SMARTWATCH-PRO-SLV';

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Customer reports issue with SmartWatch Pro (Silver) on order ${targetOrderId} and requests a replacement. Step 1: Look up customer and order details.`,
    status: 'info',
    timestamp: ts(),
  });

  const custResult = getCustomer(targetCustomerId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_customer("${targetCustomerId}")`,
    status: custResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_customer',
    tool_input: { customer_id: targetCustomerId },
    tool_output: custResult as Record<string, unknown>,
  });

  const orderResult = getOrder(targetOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_order("${targetOrderId}")`,
    status: orderResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_order',
    tool_input: { order_id: targetOrderId },
    tool_output: orderResult as Record<string, unknown>,
  });

  const policyResult = checkPolicy(targetOrderId, 'REPLACEMENT');
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling check_policy("${targetOrderId}", "REPLACEMENT") -> ${policyResult.reason || 'Checking window'}`,
    status: policyResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'check_policy',
    tool_input: { order_id: targetOrderId, action: 'REPLACEMENT' },
    tool_output: policyResult as Record<string, unknown>,
  });

  const invResult = checkInventory(targetSku);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling check_inventory("${targetSku}") -> in_stock: ${invResult.in_stock} (quantity: ${invResult.quantity_available}, restock: ${invResult.restock_date})`,
    status: 'warning',
    timestamp: ts(),
    tool_name: 'check_inventory',
    tool_input: { sku: targetSku },
    tool_output: invResult as Record<string, unknown>,
  });

  const replaceResult = processReplacement(targetOrderId, targetSku);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling process_replacement("${targetOrderId}", "${targetSku}")`,
    status: 'failure',
    timestamp: ts(),
    tool_name: 'process_replacement',
    tool_input: { order_id: targetOrderId, sku: targetSku },
    tool_output: replaceResult as Record<string, unknown>,
  });

  trace.push({
    type: 'action_failed',
    description: `[MOCK AGENT] Replacement blocked: ${replaceResult.error} Restock scheduled for ${replaceResult.restock_date}.`,
    status: 'failure',
    timestamp: ts(),
  });

  trace.push({
    type: 'replanning',
    description: `[MOCK AGENT] REPLANNING TRIGGERED: Requested SKU '${targetSku}' is out of stock until 2026-10-15. Inspecting alternative resolution: policy allows a full refund ($249.99). Formulating new plan.`,
    status: 'warning',
    timestamp: ts(),
  });

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Alternative plan selected: Process a full refund for ${targetOrderId} under the 30-day return policy, with VIP bonus credit.`,
    status: 'info',
    timestamp: ts(),
  });

  const refundPolicyResult = checkPolicy(targetOrderId, 'REFUND');
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Verifying policy for alternative: check_policy("${targetOrderId}", "REFUND")`,
    status: refundPolicyResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'check_policy',
    tool_input: { order_id: targetOrderId, action: 'REFUND' },
    tool_output: refundPolicyResult as Record<string, unknown>,
  });

  const refundResult = processRefund(targetOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling process_refund("${targetOrderId}") as alternative resolution`,
    status: refundResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'process_refund',
    tool_input: { order_id: targetOrderId },
    tool_output: refundResult as Record<string, unknown>,
  });

  trace.push({
    type: 'action_completed',
    description: `[MOCK AGENT] Alternative resolution executed: ${refundResult.message}`,
    status: 'success',
    timestamp: ts(),
  });

  const verifyResult = verifyState(targetOrderId);
  trace.push({
    type: 'state_verification',
    description: `[MOCK AGENT] Calling verify_state("${targetOrderId}") -> status: ${verifyResult.status}, resolution_state: ${verifyResult.resolution_state}, is_resolved: ${verifyResult.is_resolved}`,
    status: 'success',
    timestamp: ts(),
    tool_name: 'verify_state',
    tool_input: { order_id: targetOrderId },
    tool_output: verifyResult as Record<string, unknown>,
  });

  trace.push({
    type: 'final_resolution',
    description: `[MOCK AGENT] Resolved: Replacement could not be fulfilled due to zero inventory (restock: 2026-10-15). Alternative full refund of $${refundResult.refund_amount} successfully processed with VIP bonus credit of $${refundResult.vip_bonus_credit}.`,
    status: 'success',
    timestamp: ts(),
  });

  return {
    trace: buildTrace(trace),
    response: `I checked on your replacement request for the SmartWatch Pro (Silver) on order **${targetOrderId}**.\n\nUnfortunately, SKU \`${targetSku}\` is currently completely out of stock (0 units available), with our next restock date estimated for October 15, 2026.\n\nRather than keeping you waiting, I have automatically processed a full refund for your purchase:\n\n• **Order ID**: ${targetOrderId}\n• **Refunded Amount**: $${refundResult.refund_amount}\n${
      refundResult.vip_bonus_credit
        ? `• **VIP Bonus Credit**: $${refundResult.vip_bonus_credit} (10% VIP bonus)\n• **Total Credited**: $${refundResult.total_credited}\n`
        : ''
    }• **Payment Method**: ${refundResult.payment_method}\n\nYou will see this refund in your account within 3-5 business days. Once the item is back in stock in October, we welcome you to place a new order!`,
    status: 'resolved' as const,
  };
}

export function handlePolicyBlockedScenario(customerId: string, orderId: string) {
  const trace: Omit<TraceEvent, 'step'>[] = [];
  const targetOrderId = orderId || 'ORD-5002';
  const targetCustomerId = customerId || 'CUST-1002';

  trace.push({
    type: 'decision',
    description: `[MOCK AGENT] Customer requests cancellation for order ${targetOrderId}. Step 1: Look up order and evaluate cancellation policy.`,
    status: 'info',
    timestamp: ts(),
  });

  const custResult = getCustomer(targetCustomerId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_customer("${targetCustomerId}")`,
    status: custResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_customer',
    tool_input: { customer_id: targetCustomerId },
    tool_output: custResult as Record<string, unknown>,
  });

  const orderResult = getOrder(targetOrderId);
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling get_order("${targetOrderId}") -> status: ${(orderResult.order as { status: string })?.status}`,
    status: orderResult.success ? 'success' : 'failure',
    timestamp: ts(),
    tool_name: 'get_order',
    tool_input: { order_id: targetOrderId },
    tool_output: orderResult as Record<string, unknown>,
  });

  const policyResult = checkPolicy(targetOrderId, 'CANCEL');
  trace.push({
    type: 'tool_called',
    description: `[MOCK AGENT] Calling check_policy("${targetOrderId}", "CANCEL")`,
    status: 'failure',
    timestamp: ts(),
    tool_name: 'check_policy',
    tool_input: { order_id: targetOrderId, action: 'CANCEL' },
    tool_output: policyResult as Record<string, unknown>,
  });

  trace.push({
    type: 'action_failed',
    description: `[MOCK AGENT] Cancellation BLOCKED by policy: ${policyResult.error}`,
    status: 'failure',
    timestamp: ts(),
  });

  trace.push({
    type: 'escalation',
    description: `[MOCK AGENT] Action is blocked by enterprise policy and no automated self-service alternative is available. Escalating case to Tier 2 Human Support.`,
    status: 'warning',
    timestamp: ts(),
    metadata: {
      escalation_reason: 'Cancellation requested on delivered item exceeding automated policy rules',
      order_id: targetOrderId,
      customer_id: targetCustomerId,
    },
  });

  trace.push({
    type: 'final_resolution',
    description: `[MOCK AGENT] Case escalated to human support team. A customer service specialist will review within 24 hours.`,
    status: 'warning',
    timestamp: ts(),
  });

  return {
    trace: buildTrace(trace),
    response: `I understand you would like to cancel order **${targetOrderId}**. However, because this package has already been **DELIVERED**, our system cannot cancel it.\n\nAccording to company policy, order cancellations can only be processed before an order has shipped.\n\nI have escalated your case to our Senior Customer Support Team for manual review. A representative will contact you via email (${
      (custResult.customer as { email: string })?.email || 'your registered email'
    }) within 24 hours to assist with options like a return authorization.\n\n• **Case Reference**: ESC-${targetOrderId}`,
    status: 'escalated' as const,
  };
}

export function runMockSimulation(params: {
  scenario_id?: string;
  customer_id?: string;
  order_id?: string;
  message?: string;
  case_id?: string;
}) {
  const targetCustomerId = params.customer_id || 'CUST-1001';
  const targetOrderId = params.order_id || 'ORD-5001';

  const intent = detectMockIntent(params.message, params.scenario_id);

  let result: { trace: TraceEvent[]; response: string; status: string };

  switch (intent) {
    case 'off-topic':
      result = handleOffTopicScenario(params.message || 'General query');
      break;
    case 'unclear':
      result = handleUnclearScenario(targetOrderId, params.message || '');
      break;
    case 'order-status':
      result = handleOrderStatusScenario(targetCustomerId, targetOrderId);
      break;
    case 'tool-failure':
      result = handleToolFailureScenario(targetCustomerId, targetOrderId);
      break;
    case 'policy-blocked':
      result = handlePolicyBlockedScenario(targetCustomerId, targetOrderId);
      break;
    case 'oos-replacement':
      result = handleOosReplacementScenario(targetCustomerId, targetOrderId);
      break;
    case 'cancellation':
      result = handleCancellationScenario(targetCustomerId, targetOrderId);
      break;
    case 'refund':
    default:
      result = handleRefundScenario(targetCustomerId, targetOrderId);
      break;
  }

  let updatedCase: Case | null = null;
  if (params.case_id) {
    updatedCase = updateCase(params.case_id, {
      status: result.status as Case['status'],
      trace: result.trace,
      resolution_summary: result.trace[result.trace.length - 1]?.description,
    });
  }

  return {
    trace: result.trace,
    response: result.response,
    case: updatedCase,
  };
}
