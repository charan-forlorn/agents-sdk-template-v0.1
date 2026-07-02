import { describe, expect, it } from 'vitest';
import {
  checkReadinessAgainstRubric,
  draftChannelLaunchCopy,
  extractTasksFromBrief,
  generateOwnerChecklists,
} from '../server/tools/launchTools.js';

const completeInput = {
  productBrief:
    'Launch enterprise approval workflows with engineering owners, QA coverage, rollback plan, support macros, and adoption success metrics.',
  audience: 'Enterprise admins',
  launchDate: '2026-08-15',
  constraints: 'Security review required before rollout.',
  assets: 'Docs draft, beta quotes, demo script.',
};

describe('launch planning tools', () => {
  it('extracts prioritized launch tasks deterministically', () => {
    const first = extractTasksFromBrief(completeInput);
    const second = extractTasksFromBrief(completeInput);
    expect(first).toEqual(second);
    expect(first.some((task) => task.priority === 'P0')).toBe(true);
    expect(first.some((task) => task.ownerRole.includes('Security'))).toBe(true);
  });

  it('scores readiness lower when key details are missing', () => {
    const thinReadiness = checkReadinessAgainstRubric({
      productBrief: 'Launch a new dashboard soon.',
      audience: 'Users',
      launchDate: 'Soon',
      constraints: '',
      assets: '',
    });
    const completeReadiness = checkReadinessAgainstRubric(completeInput);
    expect(thinReadiness.score).toBeLessThan(completeReadiness.score);
    expect(thinReadiness.gaps.length).toBeGreaterThan(0);
  });

  it('generates owner checklists with missing-detail prompts', () => {
    const checklists = generateOwnerChecklists({
      productBrief: 'Launch billing exports.',
      audience: 'Finance admins',
      launchDate: '2026-09-01',
      constraints: '',
      assets: '',
    });
    expect(checklists.map((item) => item.ownerRole)).toContain('Engineering');
    expect(checklists.flatMap((item) => item.items).some((item) => item.includes('Clarify missing detail'))).toBe(true);
  });

  it('drafts copy for all required launch channels', () => {
    const copy = draftChannelLaunchCopy(completeInput);
    expect(copy.map((item) => item.channel).sort()).toEqual(['changelog', 'email', 'in-app', 'social']);
    expect(copy.every((item) => item.copy.includes('Enterprise admins') || item.channel === 'email')).toBe(true);
  });
});
