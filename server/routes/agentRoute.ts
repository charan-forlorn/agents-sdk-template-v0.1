import type { Request, Response } from 'express';
import { run } from '@openai/agents';
import { randomUUID } from 'node:crypto';
import { LaunchInputSchema } from '../domain/launchTypes.js';
import { buildLaunchPrompt, launchDeskAgent } from '../agent/launchAgent.js';
import { traceLaunchEvent } from '../observability/tracing.js';

type SseEvent = {
  type: 'tool_progress' | 'model_delta' | 'final' | 'error' | 'trace';
  name?: string;
  text?: string;
  data?: unknown;
};

function sendEvent(res: Response, event: SseEvent): void {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function extractTextDelta(event: unknown): string {
  if (
    typeof event === 'object' &&
    event &&
    'data' in event &&
    typeof event.data === 'object' &&
    event.data &&
    'type' in event.data &&
    event.data.type === 'output_text_delta' &&
    'delta' in event.data &&
    typeof event.data.delta === 'string'
  ) {
    return event.data.delta;
  }

  const raw = JSON.stringify(event);
  const candidates = [
    /"delta"\s*:\s*"([^"]+)"/,
    /"text"\s*:\s*"([^"]+)"/,
  ];
  for (const candidate of candidates) {
    const match = raw.match(candidate);
    if (match?.[1]) return match[1].replace(/\\n/g, '\n');
  }
  return '';
}

function readObjectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  return (value as Record<string, unknown>)[key];
}

function toolNameFromEvent(event: unknown): string | undefined {
  const item = readObjectProperty(event, 'item');
  const rawItem = readObjectProperty(item, 'rawItem');
  const itemName = readObjectProperty(item, 'name');
  const rawName = readObjectProperty(rawItem, 'name');
  const name = typeof itemName === 'string' ? itemName : typeof rawName === 'string' ? rawName : undefined;
  if (!name) return undefined;

  const allowedToolNames = new Set([
    'extract_tasks_from_brief',
    'check_launch_readiness',
    'generate_owner_checklists',
    'draft_channel_launch_copy',
  ]);
  return allowedToolNames.has(name) ? name : undefined;
}

export async function streamLaunchPlan(req: Request, res: Response): Promise<void> {
  const requestId = randomUUID();
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const input = LaunchInputSchema.parse(req.body);
    traceLaunchEvent({ requestId, event: 'agent.request.received' });
    sendEvent(res, { type: 'trace', data: { requestId, status: 'started' } });

    const result = await run(launchDeskAgent, buildLaunchPrompt(input), {
      stream: true,
    });

    for await (const event of result) {
      const eventType = typeof event === 'object' && event && 'type' in event ? String(event.type) : '';
      if (eventType === 'raw_model_stream_event') {
        const delta = extractTextDelta(event);
        if (delta) sendEvent(res, { type: 'model_delta', text: delta });
      }

      if (eventType === 'run_item_stream_event') {
        const toolName = toolNameFromEvent(event);
        if (toolName) {
          traceLaunchEvent({ requestId, event: 'agent.tool.progress', metadata: { toolName } });
          sendEvent(res, { type: 'tool_progress', name: toolName, data: { status: 'observed' } });
        }
      }
    }

    const finalText = await result.finalOutput;
    traceLaunchEvent({ requestId, event: 'agent.request.completed' });
    sendEvent(res, { type: 'final', text: String(finalText ?? '') });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown launch agent error';
    traceLaunchEvent({ requestId, event: 'agent.request.failed', metadata: { message } });
    sendEvent(res, { type: 'error', text: message });
  } finally {
    res.end();
  }
}
