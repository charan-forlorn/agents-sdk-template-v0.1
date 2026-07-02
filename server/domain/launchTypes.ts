import { z } from 'zod';

export const LaunchInputSchema = z.object({
  productBrief: z.string().min(20, 'Product brief should be at least 20 characters.'),
  audience: z.string().min(3, 'Audience is required.'),
  launchDate: z.string().min(4, 'Launch date is required.'),
  constraints: z.string().optional().default(''),
  assets: z.string().optional().default(''),
});

export type LaunchInput = z.infer<typeof LaunchInputSchema>;

export type PlanTask = {
  title: string;
  ownerRole: string;
  priority: 'P0' | 'P1' | 'P2';
  rationale: string;
};

export type ReadinessCheck = {
  score: number;
  status: 'blocked' | 'at-risk' | 'ready';
  gaps: string[];
  strengths: string[];
};

export type OwnerChecklist = {
  ownerRole: string;
  items: string[];
};

export type LaunchCopy = {
  channel: 'email' | 'in-app' | 'changelog' | 'social';
  copy: string;
};

export const PlanTaskSchema = z.object({
  title: z.string().min(1),
  ownerRole: z.string().min(1),
  priority: z.enum(['P0', 'P1', 'P2']),
  rationale: z.string().min(1),
});

export const OwnerChecklistSchema = z.object({
  ownerRole: z.string().min(1),
  items: z.array(z.string().min(1)),
});

export const LaunchCopySchema = z.object({
  channel: z.enum(['email', 'in-app', 'changelog', 'social']),
  copy: z.string().min(1),
});

export const LaunchRiskSchema = z.object({
  title: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().min(1),
});

export type LaunchRisk = z.infer<typeof LaunchRiskSchema>;

export const StructuredLaunchPlanSchema = z.object({
  prioritized_plan: z.array(PlanTaskSchema),
  risks: z.array(LaunchRiskSchema),
  owner_checklist: z.array(OwnerChecklistSchema),
  launch_copy: z.array(LaunchCopySchema),
  follow_up_questions: z.array(z.string().min(1)),
});

export type StructuredLaunchPlan = z.infer<typeof StructuredLaunchPlanSchema>;

export function normalizeLaunchInput(input: LaunchInput): LaunchInput {
  return {
    productBrief: input.productBrief.trim(),
    audience: input.audience.trim(),
    launchDate: input.launchDate.trim(),
    constraints: input.constraints?.trim() ?? '',
    assets: input.assets?.trim() ?? '',
  };
}

export function missingLaunchDetails(input: LaunchInput): string[] {
  const gaps: string[] = [];
  if (!/owner|eng|pm|design|marketing|support|qa|docs/i.test(input.productBrief + input.constraints)) {
    gaps.push('named owners or accountable roles');
  }
  if (!/metric|kpi|goal|success|adoption|activation|revenue|retention/i.test(input.productBrief)) {
    gaps.push('launch success metrics');
  }
  if (!/risk|rollback|support|qa|test|legal|security|privacy/i.test(input.productBrief + input.constraints)) {
    gaps.push('risk, QA, compliance, or rollback expectations');
  }
  if (!input.assets || input.assets.length < 5) {
    gaps.push('available creative, docs, enablement, or demo assets');
  }
  return gaps;
}
