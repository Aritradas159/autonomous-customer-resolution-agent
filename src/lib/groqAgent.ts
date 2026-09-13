// ============================================================
// Groq AI Autonomous Customer Resolution Agent
// Uses Groq SDK with real-time tool calling against backend tools
// The API key is ONLY read on the server from process.env.GROQ_API_KEY
// ============================================================

import Groq from 'groq-sdk';
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
import { TraceEvent, ToolResult } from '@/lib/types';

export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Groq tool definitions conforming to the function calling schema
export const GROQ_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_customer',
      description: 'Retrieve customer account profile, tier status (VIP, Standard), contact info, and linked order IDs.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: {
            type: 'string',
            description: 'The unique customer identifier, e.g. CUST-1001',
          },
        },
        required: ['customer_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Retrieve detailed order information including line items, SKU codes, delivery date, status, and event audit history.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The order identifier, e.g. ORD-5001, ORD-5004',
          },
        },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_inventory',
      description: 'Check real-time stock availability and restock dates for a specific product SKU. Always check inventory before issuing a replacement.',
      parameters: {
        type: 'object',
        properties: {
          sku: {
            type: 'string',
            description: 'The product SKU code, e.g. SKU-SMARTWATCH-PRO-SLV',
          },
        },
        required: ['sku'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_policy',
      description: 'Check whether a proposed customer resolution action (REFUND, REPLACEMENT, or CANCEL) is permitted under company policy for the given order.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The order identifier to evaluate',
          },
          action: {
            type: 'string',
            enum: ['REFUND', 'REPLACEMENT', 'CANCEL'],
            description: 'The policy action to evaluate',
          },
        },
        required: ['order_id', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'process_refund',
      description: 'Execute a refund for an order. VIP customers automatically receive a 10% bonus store credit. Must only be executed if permitted by policy.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The order identifier to refund',
          },
          amount: {
            type: 'number',
            description: 'Optional refund amount. Defaults to the full order total if omitted.',
          },
        },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'process_replacement',
      description: 'Process a replacement unit for an item. Will FAIL honestly if the replacement SKU is out of stock (quantity 0). Always check inventory before or handle failure gracefully by replanning.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The order identifier needing replacement',
          },
          sku: {
            type: 'string',
            description: 'The SKU of the replacement item, e.g. SKU-SMARTWATCH-PRO-SLV',
          },
        },
        required: ['order_id', 'sku'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_order',
      description: 'Cancel an order before it has shipped and trigger an automatic refund. Only permitted for PENDING or PROCESSING orders. Blocked for DELIVERED orders.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The order identifier to cancel',
          },
        },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'verify_state',
      description: 'Audit and verify the final state and resolution status of an order after executing an action.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The order identifier to verify',
          },
        },
        required: ['order_id'],
      },
    },
  },
];

export const SYSTEM_PROMPT = `You are an Autonomous Customer Resolution Agent for an enterprise e-commerce platform.
Your objective is to assist customers accurately, professionally, and empathetically regarding orders, tracking, policies, returns, refunds, replacements, and cancellations.

MANDATORY GUIDELINES FOR INTENT EVALUATION & TOOL USAGE:

1. INTENT RECOGNITION & SCOPE BOUNDARIES:
   - UNRELATED / OFF-TOPIC REQUESTS (e.g. "Tell me a joke", general trivia, coding, casual chit-chat):
     * Politely explain your scope as an automated customer service assistant dedicated to helping with order tracking, refunds, replacements, cancellations, and store policies.
     * Do NOT call tools or inspect orders for unrelated requests. Do NOT invent actions or responses.
   - UNCLEAR OR AMBIGUOUS REQUESTS (e.g. "help", "my item broke", "what can you do?"):
     * Ask a concise, polite clarifying question to understand specifically how you can help.
     * Do NOT execute mutating actions (refunds, replacements, cancellations) on vague or underspecified messages.
   - INFORMATIONAL INQUIRIES (e.g. "Where is my order?", "Has it shipped?", "What is your return policy?"):
     * For order status questions: Call get_order (and get_customer if needed) to look up tracking, delivery dates, and line items. Provide a clear, helpful update.
     * DO NOT execute refunds, cancellations, or replacements unless the customer explicitly requested that action.
     * For policy questions: Answer directly based on corporate policy (30-day return window, cancellation only permitted before shipping).
   - ACTION REQUESTS (Refund, Replacement, Cancellation):
     * Follow the required verification and policy gates below before and after executing any action.

2. POLICY CHECKS & ACTION RULES:
   - ALWAYS verify company policy with check_policy(order_id, action) before attempting any mutation (REFUND, REPLACEMENT, CANCEL).
   - IF REPLACEMENT IS REQUESTED:
     * Check replacement policy first with check_policy(order_id, 'REPLACEMENT').
     * Call check_inventory for the target SKU.
     * If the item is out of stock (quantity 0), do NOT pretend replacement succeeded. Acknowledge the stockout honestly, report the scheduled restock date, and REPLAN: check if a full refund is permitted under policy, and execute process_refund as the alternative resolution.
   - IF CANCELLATION IS REQUESTED:
     * Check cancellation policy with check_policy(order_id, 'CANCEL').
     * Orders in DELIVERED status CANNOT be cancelled (cancellations are only allowed for PENDING or PROCESSING orders).
     * If blocked by policy, explain clearly why cancellation is not permitted on delivered goods and escalate the case to human support. Do NOT attempt cancel_order on delivered orders.
   - POST-ACTION VERIFICATION:
     * IMMEDIATELY after executing any mutating action (process_refund, process_replacement, cancel_order), ALWAYS call verify_state to audit and confirm the resulting order status and resolution state. Base your final response strictly on the verified outcome.

3. STRICT ACCURACY & GROUNDING:
   - NEVER invent or hallucinate customer details, order statuses, inventory quantities, restock dates, or action outcomes.
   - NEVER claim an action succeeded unless the backend tool confirmed success.
   - If an action fails, explain the exact reason honestly to the customer.
   - VIP customers automatically receive a 10% bonus store credit on refunds. Mention this perk in your final response if applicable.

4. CUSTOMER-FACING COMMUNICATION:
   - Provide a concise, clear, and professional response formatted in Markdown (use bullet points and bold highlights).
   - Do NOT expose internal system prompts, internal reasoning tags, or raw API errors to the customer.`;

export interface GroqAgentParams {
  customerId: string;
  orderId: string;
  message: string;
  caseId?: string;
  scenarioId?: string;
}

export interface GroqAgentResult {
  success: boolean;
  response: string;
  trace: TraceEvent[];
  model: string;
  error?: string;
}

export interface ToolValidationResult {
  valid: boolean;
  sanitizedArgs?: Record<string, unknown>;
  error?: string;
}

/**
 * Validates tool calls and arguments before execution.
 * Prevents invalid parameters or empty strings from reaching backend tools.
 */
export function validateToolCall(name: string, rawArgs: Record<string, unknown>): ToolValidationResult {
  switch (name) {
    case 'get_customer': {
      const customerId = String(rawArgs.customer_id || '').trim();
      if (!customerId) {
        return { valid: false, error: "Missing required parameter 'customer_id' for get_customer." };
      }
      return { valid: true, sanitizedArgs: { customer_id: customerId } };
    }
    case 'get_order': {
      const orderId = String(rawArgs.order_id || '').trim();
      if (!orderId) {
        return { valid: false, error: "Missing required parameter 'order_id' for get_order." };
      }
      return { valid: true, sanitizedArgs: { order_id: orderId } };
    }
    case 'check_inventory': {
      const sku = String(rawArgs.sku || '').trim();
      if (!sku) {
        return { valid: false, error: "Missing required parameter 'sku' for check_inventory." };
      }
      return { valid: true, sanitizedArgs: { sku } };
    }
    case 'check_policy': {
      const orderId = String(rawArgs.order_id || '').trim();
      const action = String(rawArgs.action || '').trim().toUpperCase();
      if (!orderId) {
        return { valid: false, error: "Missing required parameter 'order_id' for check_policy." };
      }
      if (!['REFUND', 'REPLACEMENT', 'CANCEL'].includes(action)) {
        return {
          valid: false,
          error: `Invalid action '${action}' for check_policy. Allowed actions: REFUND, REPLACEMENT, CANCEL.`,
        };
      }
      return { valid: true, sanitizedArgs: { order_id: orderId, action } };
    }
    case 'process_refund': {
      const orderId = String(rawArgs.order_id || '').trim();
      if (!orderId) {
        return { valid: false, error: "Missing required parameter 'order_id' for process_refund." };
      }
      let amount: number | undefined = undefined;
      if (rawArgs.amount !== undefined && rawArgs.amount !== null && rawArgs.amount !== '') {
        const parsed = Number(rawArgs.amount);
        if (isNaN(parsed) || parsed <= 0) {
          return { valid: false, error: `Invalid refund amount '${rawArgs.amount}'. Must be a positive number.` };
        }
        amount = parsed;
      }
      return { valid: true, sanitizedArgs: { order_id: orderId, ...(amount !== undefined ? { amount } : {}) } };
    }
    case 'process_replacement': {
      const orderId = String(rawArgs.order_id || '').trim();
      const sku = String(rawArgs.sku || '').trim();
      if (!orderId) {
        return { valid: false, error: "Missing required parameter 'order_id' for process_replacement." };
      }
      if (!sku) {
        return { valid: false, error: "Missing required parameter 'sku' for process_replacement." };
      }
      return { valid: true, sanitizedArgs: { order_id: orderId, sku } };
    }
    case 'cancel_order': {
      const orderId = String(rawArgs.order_id || '').trim();
      if (!orderId) {
        return { valid: false, error: "Missing required parameter 'order_id' for cancel_order." };
      }
      return { valid: true, sanitizedArgs: { order_id: orderId } };
    }
    case 'verify_state': {
      const orderId = String(rawArgs.order_id || '').trim();
      if (!orderId) {
        return { valid: false, error: "Missing required parameter 'order_id' for verify_state." };
      }
      return { valid: true, sanitizedArgs: { order_id: orderId } };
    }
    default:
      return { valid: false, error: `Unknown tool '${name}'.` };
  }
}

/**
 * Executes a tool call against the simulated enterprise tools engine.
 * Never fakes results; validates arguments and calls real backend functions.
 */
export function executeTool(name: string, rawArgs: Record<string, unknown>): ToolResult {
  const validation = validateToolCall(name, rawArgs);
  if (!validation.valid || !validation.sanitizedArgs) {
    return {
      success: false,
      error: validation.error || `Invalid arguments for tool '${name}'.`,
    };
  }

  const args = validation.sanitizedArgs;
  try {
    switch (name) {
      case 'get_customer':
        return getCustomer(String(args.customer_id));
      case 'get_order':
        return getOrder(String(args.order_id));
      case 'check_inventory':
        return checkInventory(String(args.sku));
      case 'check_policy':
        return checkPolicy(String(args.order_id), String(args.action));
      case 'process_refund':
        return processRefund(
          String(args.order_id),
          typeof args.amount === 'number' ? args.amount : undefined
        );
      case 'process_replacement':
        return processReplacement(String(args.order_id), String(args.sku));
      case 'cancel_order':
        return cancelOrder(String(args.order_id));
      case 'verify_state':
        return verifyState(String(args.order_id));
      default:
        return { success: false, error: `Unknown tool name '${name}'` };
    }
  } catch (err) {
    return {
      success: false,
      error: `Backend tool execution error: ${err instanceof Error ? err.message : 'Unknown tool failure'}`,
    };
  }
}

/**
 * Runs the autonomous Groq agent reasoning and tool-calling loop.
 */
export async function runGroqAgent(params: GroqAgentParams): Promise<GroqAgentResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'GROQ_API_KEY environment variable is not configured on the server. Please add your Groq API key to .env.local to enable live Groq AI reasoning, or use Mock Simulation mode as a fallback.'
    );
  }

  const groq = new Groq({ apiKey });
  const model = GROQ_MODEL;
  const trace: Omit<TraceEvent, 'step'>[] = [];

  const conversationMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Customer ID: ${params.customerId}\nAssociated Order ID: ${params.orderId}\nCustomer Message: "${params.message}"\n\nPlease evaluate the customer's intent carefully. If off-topic, explain your customer-support scope. If unclear, ask a clarifying question. If inquiring about order status, look up details without modifying the order. If an action is requested, verify policy and state before and after execution.`,
    },
  ];

  let finalResponseText = '';
  let hadFailedAction = false;
  let mutatedOrderId: string | null = null;
  let verifiedOrder = false;
  const maxIterations = 10;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    const completion = await groq.chat.completions.create({
      model,
      messages: conversationMessages,
      tools: GROQ_TOOLS,
      tool_choice: 'auto',
      temperature: 0.1,
    });

    const choice = completion.choices[0];
    if (!choice || !choice.message) {
      break;
    }

    const assistantMsg = choice.message;
    conversationMessages.push(assistantMsg);

    // Capture model's thoughts / explanation if provided
    if (assistantMsg.content && assistantMsg.content.trim()) {
      finalResponseText = assistantMsg.content;
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        trace.push({
          type: 'decision',
          description: assistantMsg.content,
          status: 'info',
          timestamp: new Date().toISOString(),
          metadata: { model, iteration },
        });
      }
    }

    // If no tool calls, the model has finished
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      break;
    }

    // Execute tool calls issued by the model
    for (const toolCall of assistantMsg.tool_calls) {
      if (toolCall.type !== 'function') continue;

      const fnName = toolCall.function.name;
      let rawArgs: Record<string, unknown> = {};
      try {
        rawArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch {
        rawArgs = {};
      }

      // Record tool invocation
      trace.push({
        type: 'tool_called',
        description: `Calling tool ${fnName}(${Object.entries(rawArgs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(', ')})`,
        status: 'info',
        tool_name: fnName,
        tool_input: rawArgs,
        timestamp: new Date().toISOString(),
        metadata: { model, tool_call_id: toolCall.id },
      });

      // Execute tool honestly against backend engine
      const toolResult = executeTool(fnName, rawArgs);

      // Record appropriate trace event based on tool outcome
      if (!toolResult.success) {
        hadFailedAction = true;
        trace.push({
          type: 'action_failed',
          description: `Tool ${fnName} failed: ${toolResult.error || 'Action not permitted'}`,
          status: 'failure',
          tool_name: fnName,
          tool_input: rawArgs,
          tool_output: toolResult as Record<string, unknown>,
          timestamp: new Date().toISOString(),
          metadata: { model },
        });

        // If replacement or inventory check failed due to stockout, record replanning
        if (fnName === 'process_replacement' || (fnName === 'check_inventory' && !toolResult.in_stock)) {
          trace.push({
            type: 'replanning',
            description: `Target SKU is out of stock (${toolResult.out_of_stock_sku || toolResult.sku || 'item'}). Formulating alternative resolution plan.`,
            status: 'warning',
            timestamp: new Date().toISOString(),
            metadata: { model },
          });
        }
      } else {
        // Success trace events
        if (fnName === 'verify_state') {
          verifiedOrder = true;
          trace.push({
            type: 'state_verification',
            description: `Order state verified: status=${toolResult.status}, resolution_state=${toolResult.resolution_state}, is_resolved=${toolResult.is_resolved}`,
            status: 'success',
            tool_name: fnName,
            tool_input: rawArgs,
            tool_output: toolResult as Record<string, unknown>,
            timestamp: new Date().toISOString(),
            metadata: { model },
          });
        } else if (['process_refund', 'process_replacement', 'cancel_order'].includes(fnName)) {
          mutatedOrderId = String(rawArgs.order_id || params.orderId);
          trace.push({
            type: 'action_completed',
            description: String(toolResult.message || `Action ${fnName} completed successfully.`),
            status: 'success',
            tool_name: fnName,
            tool_input: rawArgs,
            tool_output: toolResult as Record<string, unknown>,
            timestamp: new Date().toISOString(),
            metadata: { model },
          });
        } else {
          trace.push({
            type: 'tool_result',
            description: `${fnName} completed successfully.`,
            status: 'success',
            tool_name: fnName,
            tool_input: rawArgs,
            tool_output: toolResult as Record<string, unknown>,
            timestamp: new Date().toISOString(),
            metadata: { model },
          });
        }
      }

      // Return real tool result back to Groq message history
      conversationMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  // Ensure post-action state verification was performed if an action mutated order state
  if (mutatedOrderId && !verifiedOrder) {
    const autoVerify = verifyState(mutatedOrderId);
    trace.push({
      type: 'state_verification',
      description: `Post-action audit verified: status=${autoVerify.status}, resolution_state=${autoVerify.resolution_state}, is_resolved=${autoVerify.is_resolved}`,
      status: 'success',
      tool_name: 'verify_state',
      tool_input: { order_id: mutatedOrderId },
      tool_output: autoVerify as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      metadata: { model, auto_verified: true },
    });
  }

  // Categorize resolution nature for trace & case state
  const isEscalated =
    finalResponseText.toLowerCase().includes('escalat') ||
    finalResponseText.toLowerCase().includes('human support') ||
    finalResponseText.toLowerCase().includes('support team');

  const toolsCalledCount = trace.filter((t) => t.type === 'tool_called').length;
  const isClarification =
    toolsCalledCount === 0 &&
    (finalResponseText.includes('?') || finalResponseText.toLowerCase().includes('clarif'));

  const isOffTopic = toolsCalledCount === 0 && !isClarification;

  if (isEscalated && hadFailedAction) {
    trace.push({
      type: 'escalation',
      description: 'Case escalated to human customer support team as automated self-service resolution is not permitted by policy.',
      status: 'warning',
      timestamp: new Date().toISOString(),
      metadata: { model },
    });
  }

  // If no tools were called, log initial decision trace explaining intent
  if (toolsCalledCount === 0) {
    trace.unshift({
      type: 'decision',
      description: isClarification
        ? 'Customer request evaluated: additional information or clarification needed before initiating actions.'
        : 'Customer message evaluated: off-topic or general query addressed within customer support boundaries.',
      status: 'info',
      timestamp: new Date().toISOString(),
      metadata: { model },
    });
  }

  // Final resolution event
  let finalResolutionDesc = 'Resolution completed successfully via verified autonomous actions.';
  let finalStatus: 'success' | 'warning' | 'info' = 'success';

  if (isEscalated) {
    finalResolutionDesc = 'Resolution completed: Case escalated to human customer support specialist.';
    finalStatus = 'warning';
  } else if (isOffTopic) {
    finalResolutionDesc = 'Customer message addressed: Service scope explained.';
    finalStatus = 'info';
  } else if (isClarification) {
    finalResolutionDesc = 'Clarification requested from customer.';
    finalStatus = 'info';
  } else if (mutatedOrderId) {
    finalResolutionDesc = 'Resolution completed and confirmed via post-action state verification.';
    finalStatus = 'success';
  } else {
    finalResolutionDesc = 'Customer inquiry answered with verified order and policy details.';
    finalStatus = 'success';
  }

  trace.push({
    type: 'final_resolution',
    description: finalResolutionDesc,
    status: finalStatus,
    timestamp: new Date().toISOString(),
    metadata: { model },
  });

  // Assign 1-indexed sequential step numbers
  const numberedTrace: TraceEvent[] = trace.map((e, i) => ({
    ...e,
    step: i + 1,
  }));

  // Update backend case record if caseId was provided
  if (params.caseId) {
    let caseStatus: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'failed' = 'resolved';
    if (isEscalated) {
      caseStatus = 'escalated';
    } else if (isOffTopic || isClarification) {
      caseStatus = 'open';
    } else if (hadFailedAction && !mutatedOrderId) {
      caseStatus = 'failed';
    }

    updateCase(params.caseId, {
      status: caseStatus,
      trace: numberedTrace,
      resolution_summary: finalResponseText.substring(0, 200) + '...',
    });
  }

  return {
    success: true,
    response: finalResponseText,
    trace: numberedTrace,
    model,
  };
}
