import { tool } from '@openai/agents';
import { z } from 'zod';
import type { LaunchInput, LaunchCopy, OwnerChecklist, PlanTask, ReadinessCheck } from '../domain/launchTypes.js';
import { LaunchInputSchema, missingLaunchDetails, normalizeLaunchInput } from '../domain/launchTypes.js';

const launchInputParameters = z.object({
  productBrief: z.string(),
  audience: z.string(),
  launchDate: z.string(),
  constraints: z.string().optional(),
  assets: z.string().optional(),
});

export function extractTasksFromBrief(input: LaunchInput): PlanTask[] {
  const normalized = normalizeLaunchInput(input);
  const tasks: PlanTask[] = [
    {
      title: 'Freeze launch scope and acceptance criteria',
      ownerRole: 'Product + Engineering',
      priority: 'P0',
      rationale: 'The team needs a locked release surface before sequencing launch work.',
    },
    {
      title: 'Complete release validation and rollback plan',
      ownerRole: 'Engineering',
      priority: 'P0',
      rationale: 'A launch date is only credible when validation and recovery paths are explicit.',
    },
    {
      title: 'Prepare audience-specific announcement assets',
      ownerRole: 'Product Marketing',
      priority: normalized.assets ? 'P1' : 'P0',
      rationale: normalized.assets
        ? 'Existing assets should be packaged for each channel.'
        : 'Missing assets can block announcement quality and timing.',
    },
    {
      title: 'Align support, docs, and internal enablement',
      ownerRole: 'Support + Docs',
      priority: 'P1',
      rationale: 'Customer-facing teams need answers before the first public announcement.',
    },
  ];

  if (/security|privacy|legal|compliance|soc2|hipaa|gdpr/i.test(normalized.constraints + normalized.productBrief)) {
    tasks.splice(2, 0, {
      title: 'Complete security, privacy, and legal review',
      ownerRole: 'Security + Legal',
      priority: 'P0',
      rationale: 'The brief or constraints indicate a regulated or trust-sensitive launch.',
    });
  }

  return tasks;
}

export function checkReadinessAgainstRubric(input: LaunchInput): ReadinessCheck {
  const normalized = normalizeLaunchInput(input);
  const gaps = missingLaunchDetails(normalized);
  const strengths: string[] = [];
  if (normalized.productBrief.length > 120) strengths.push('clear product context');
  if (normalized.audience.length > 8) strengths.push('identified audience');
  if (normalized.launchDate) strengths.push('target launch date');
  if (normalized.constraints) strengths.push('known constraints');
  if (normalized.assets) strengths.push('known launch assets');

  const score = Math.max(20, Math.min(100, 100 - gaps.length * 18 + strengths.length * 4));
  return {
    score,
    status: score < 55 ? 'blocked' : score < 78 ? 'at-risk' : 'ready',
    gaps,
    strengths,
  };
}

export function generateOwnerChecklists(input: LaunchInput): OwnerChecklist[] {
  const readiness = checkReadinessAgainstRubric(input);
  return [
    {
      ownerRole: 'Engineering',
      items: [
        'Confirm release branch, feature flags, migrations, and rollback owner.',
        'Run launch-critical tests and document known limitations.',
        'Publish deploy window, monitoring links, and incident escalation path.',
      ],
    },
    {
      ownerRole: 'Product',
      items: [
        'Lock launch scope, non-goals, and decision log.',
        'Define success metrics and first-week readout owner.',
        ...readiness.gaps.map((gap) => `Clarify missing detail: ${gap}.`),
      ],
    },
    {
      ownerRole: 'Go-to-market',
      items: [
        'Adapt launch story for email, in-app, changelog, and social.',
        'Confirm asset readiness and approval workflow.',
        'Prepare support macros and customer-facing FAQ.',
      ],
    },
  ];
}

export function draftChannelLaunchCopy(input: LaunchInput): LaunchCopy[] {
  const normalized = normalizeLaunchInput(input);
  const audience = normalized.audience || 'your target users';
  const shortBrief = normalized.productBrief.replace(/\s+/g, ' ').slice(0, 180);
  return [
    {
      channel: 'email',
      copy: `Subject: A better way to ${audience.toLowerCase()} ship with confidence\n\nWe are launching an update built around ${shortBrief}. It is designed for ${audience} and will be available on ${normalized.launchDate}.`,
    },
    {
      channel: 'in-app',
      copy: `New: ${shortBrief}. Built for ${audience}. Review the changes and share feedback before the launch window closes.`,
    },
    {
      channel: 'changelog',
      copy: `Launch note: ${shortBrief}. Includes rollout planning, owner alignment, and readiness checks for ${audience}.`,
    },
    {
      channel: 'social',
      copy: `Launching ${normalized.launchDate}: ${shortBrief}. Built with ${audience} in mind.`,
    },
  ];
}

export const launchPlanningTools = [
  tool({
    name: 'extract_tasks_from_brief',
    description: 'Extract prioritized launch tasks from the product brief and constraints.',
    parameters: launchInputParameters,
    execute: async (input) => extractTasksFromBrief(LaunchInputSchema.parse(input)),
  }),
  tool({
    name: 'check_launch_readiness',
    description: 'Score launch readiness against a practical release rubric and list gaps.',
    parameters: launchInputParameters,
    execute: async (input) => checkReadinessAgainstRubric(LaunchInputSchema.parse(input)),
  }),
  tool({
    name: 'generate_owner_checklists',
    description: 'Generate owner-specific launch checklists for engineering, product, and go-to-market.',
    parameters: launchInputParameters,
    execute: async (input) => generateOwnerChecklists(LaunchInputSchema.parse(input)),
  }),
  tool({
    name: 'draft_channel_launch_copy',
    description: 'Draft channel-specific launch copy for email, in-app, changelog, and social.',
    parameters: launchInputParameters,
    execute: async (input) => draftChannelLaunchCopy(LaunchInputSchema.parse(input)),
  }),
];
