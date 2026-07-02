import { describe, expect, it } from 'vitest';
import { createFinalEvent } from '../server/routes/agentRoute.js';

const completeInput = {
  productBrief:
    'Launch enterprise approval workflows with engineering owners, QA coverage, rollback plan, support macros, and adoption success metrics.',
  audience: 'Enterprise admins',
  launchDate: '2026-08-15',
  constraints: 'Security review required before rollout.',
  assets: 'Docs draft, beta quotes, demo script.',
};

describe('agent route final event compatibility', () => {
  it('keeps final event type and text while adding structured data under data.structured', () => {
    const event = createFinalEvent(completeInput, 'Final launch plan text.');

    expect(event.type).toBe('final');
    expect(event.text).toBe('Final launch plan text.');
    expect(event.data?.structured).toBeDefined();
    expect(event.data?.structured.prioritized_plan.length).toBeGreaterThan(0);
    expect('structured' in event).toBe(false);
  });

  it('falls back to text-only final event when structured generation fails', () => {
    const event = createFinalEvent(completeInput, 'Text-only launch plan.', () => {
      throw new Error('test-only structured output failure');
    });

    expect(event).toEqual({
      type: 'final',
      text: 'Text-only launch plan.',
    });
  });
});
