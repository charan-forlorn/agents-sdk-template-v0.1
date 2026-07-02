import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileText,
  Loader2,
  Megaphone,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import './styles.css';

type LaunchForm = {
  productBrief: string;
  audience: string;
  launchDate: string;
  constraints: string;
  assets: string;
};

type StreamEvent = {
  type: 'tool_progress' | 'model_delta' | 'final' | 'error' | 'trace';
  name?: string;
  text?: string;
  data?: {
    structured?: StructuredLaunchPlan;
  };
};

type StructuredLaunchPlan = {
  prioritized_plan: Array<{
    title: string;
    ownerRole: string;
    priority: 'P0' | 'P1' | 'P2';
    rationale: string;
  }>;
  risks: Array<{
    title: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  owner_checklist: Array<{
    ownerRole: string;
    items: string[];
  }>;
  launch_copy: Array<{
    channel: 'email' | 'in-app' | 'changelog' | 'social';
    copy: string;
  }>;
  follow_up_questions: string[];
};

const initialForm: LaunchForm = {
  productBrief:
    'We are launching role-based approval workflows for enterprise teams so admins can define who can publish critical workspace changes.',
  audience: 'Enterprise workspace admins and engineering managers',
  launchDate: '2026-08-15',
  constraints: 'Must pass security review, support rollback with feature flags, and coordinate docs before release.',
  assets: 'Draft docs page, internal enablement notes, demo recording outline, beta feedback summary.',
};

const toolLabels: Record<string, string> = {
  extract_tasks_from_brief: 'Extract tasks',
  check_launch_readiness: 'Readiness rubric',
  generate_owner_checklists: 'Owner checklists',
  draft_channel_launch_copy: 'Draft copy',
};

const examplePrompts: Array<{ label: string; form: LaunchForm }> = [
  {
    label: 'Summarize this idea',
    form: {
      productBrief:
        'Launch an AI summary sidebar that helps support managers turn long customer threads into concise action notes with quality review and audit history.',
      audience: 'Support managers and customer success leads',
      launchDate: '2026-08-20',
      constraints: 'Needs privacy review, internal beta feedback, and clear rollback instructions.',
      assets: 'Prototype demo, early beta notes, draft help-center article.',
    },
  },
  {
    label: 'Create a launch checklist',
    form: {
      productBrief:
        'Release workspace template sharing for engineering teams with admin controls, adoption metrics, docs updates, and support enablement.',
      audience: 'Engineering managers and workspace admins',
      launchDate: '2026-09-10',
      constraints: 'Feature-flag rollout, no customer downtime, support coverage required.',
      assets: 'Docs draft, demo recording outline, customer quote, support FAQ.',
    },
  },
  {
    label: 'Draft an automation workflow',
    form: {
      productBrief:
        'Launch automated incident handoff workflows that route unresolved alerts to the next on-call owner and create a release-readiness audit trail.',
      audience: 'Platform engineering and incident response teams',
      launchDate: '2026-10-01',
      constraints: 'Must pass security review and include manual override guidance.',
      assets: 'Runbook draft, workflow diagram, internal enablement notes.',
    },
  },
  {
    label: 'Explain this codebase',
    form: {
      productBrief:
        'Package this Agents SDK starter as a reusable developer template with clear frontend, API, agent, tool, test, and documentation boundaries.',
      audience: 'Developers building OpenAI Agents SDK web apps',
      launchDate: '2026-08-01',
      constraints: 'Keep the template beginner-friendly and avoid exposing server-side secrets in the browser.',
      assets: 'README, validation checklist, certification report, browser screenshots.',
    },
  },
];

function App() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<'idle' | 'streaming' | 'complete' | 'error'>('idle');
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [draft, setDraft] = useState('');
  const [finalText, setFinalText] = useState('');
  const [structuredPlan, setStructuredPlan] = useState<StructuredLaunchPlan | null>(null);

  const completedTools = useMemo(
    () => Array.from(new Set(events.filter((event) => event.type === 'tool_progress').map((event) => event.name ?? 'tool'))),
    [events],
  );

  async function submitLaunchPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('streaming');
    setEvents([]);
    setDraft('');
    setFinalText('');
    setStructuredPlan(null);

    try {
      const response = await fetch('/api/agent/launch-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.body) throw new Error('The API did not return a readable stream.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '));
          if (!dataLine) continue;
          const parsed = JSON.parse(dataLine.slice(6)) as StreamEvent;
          setEvents((current) => [...current, parsed]);
          if (parsed.type === 'model_delta' && parsed.text) setDraft((current) => current + parsed.text);
          if (parsed.type === 'final') {
            if (parsed.text) setFinalText(parsed.text);
            setStructuredPlan(parsed.data?.structured ?? null);
          }
          if (parsed.type === 'error') throw new Error(parsed.text || 'Agent stream failed.');
        }
      }

      setStatus('complete');
    } catch (error) {
      setStatus('error');
      setEvents((current) => [
        ...current,
        { type: 'error', text: error instanceof Error ? error.message : 'Unknown stream error' },
      ]);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Launch Desk</h1>
          <p>Agents SDK Template for building and testing streamed agent workflows from a clean starter app.</p>
        </div>
        <div className={`stream-pill ${status}`}>
          {status === 'streaming' ? <Loader2 size={16} className="spin" /> : <Radio size={16} />}
          {status === 'idle' ? 'Ready' : status === 'complete' ? 'Stream complete' : status === 'error' ? 'Needs attention' : 'Streaming'}
        </div>
      </header>

      <section className="template-guide" aria-label="Template usage guide">
        <div className="guide-card intro">
          <Sparkles size={20} />
          <div>
            <h2>Agents SDK Template</h2>
            <p>Use this working launch-planning demo as a starting point for your own agent UI, API route, tools, and tests.</p>
          </div>
        </div>

        <div className="guide-card flow">
          {['Write a task', 'Run the agent', 'Review the response'].map((step, index) => (
            <div className="flow-step" key={step}>
              <span>{index + 1}</span>
              {step}
            </div>
          ))}
        </div>

        <div className="guide-card setup">
          <div className="setup-title">
            <Code2 size={18} />
            <h2>Developer setup</h2>
          </div>
          <code>pnpm install</code>
          <code>pnpm dev</code>
          <code>pnpm test</code>
          <code>pnpm run build</code>
        </div>

        <div className="guide-card notice">
          <FileText size={18} />
          <p>Live agent calls require server-side <strong>OPENAI_API_KEY</strong>. Keep `.env.local` local and out of git.</p>
        </div>
      </section>

      <section className="workspace">
        <form className="input-panel" onSubmit={submitLaunchPlan}>
          <div className="panel-title">
            <ClipboardList size={20} />
            <h2>Launch brief</h2>
          </div>

          <label>
            Product brief
            <textarea
              value={form.productBrief}
              onChange={(event) => setForm({ ...form, productBrief: event.target.value })}
              rows={8}
              required
            />
          </label>

          <div className="two-up">
            <label>
              Audience
              <input value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} required />
            </label>
            <label>
              Launch date
              <input type="date" value={form.launchDate} onChange={(event) => setForm({ ...form, launchDate: event.target.value })} required />
            </label>
          </div>

          <label>
            Constraints
            <textarea value={form.constraints} onChange={(event) => setForm({ ...form, constraints: event.target.value })} rows={4} />
          </label>

          <label>
            Available assets
            <textarea value={form.assets} onChange={(event) => setForm({ ...form, assets: event.target.value })} rows={4} />
          </label>

          <div className="example-prompts" aria-label="Example prompts">
            <span>Examples</span>
            <div className="example-grid">
              {examplePrompts.map((example) => (
                <button type="button" className="example-button" key={example.label} onClick={() => setForm(example.form)}>
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <button className="primary-button" disabled={status === 'streaming'}>
            {status === 'streaming' ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            Generate release plan
          </button>
        </form>

        <section className="output-panel">
          <div className="progress-rail">
            <div className="panel-title compact">
              <ShieldCheck size={18} />
              <h2>Agent progress</h2>
            </div>
            {Object.entries(toolLabels).map(([key, label]) => (
              <div className={`tool-step ${completedTools.includes(key) ? 'done' : ''}`} key={key}>
                {completedTools.includes(key) ? <CheckCircle2 size={17} /> : <span className="step-dot" />}
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="response-view">
            <div className="response-header">
              <div>
                <h2>Release plan</h2>
                <p>{status === 'streaming' ? 'Model text is arriving as the tools complete.' : 'Generated plan appears here.'}</p>
              </div>
              <Megaphone size={22} />
            </div>

            <article className="agent-output">
              {structuredPlan ? (
                <StructuredPlanView plan={structuredPlan} fallbackText={finalText} />
              ) : finalText || draft ? (
                <pre>{finalText || draft}</pre>
              ) : (
                <div className="empty-state">
                  <AlertTriangle size={24} />
                  <span>Submit the brief to stream a prioritized plan, risks, checklists, copy, and follow-up questions.</span>
                </div>
              )}
            </article>

            {events.some((event) => event.type === 'error') && (
              <div className="error-box">{events.find((event) => event.type === 'error')?.text}</div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function StructuredPlanView({ plan, fallbackText }: { plan: StructuredLaunchPlan; fallbackText: string }) {
  return (
    <div className="structured-output">
      <section>
        <h3>Prioritized plan</h3>
        <ol>
          {plan.prioritized_plan.map((task) => (
            <li key={`${task.priority}-${task.title}`}>
              <strong>{task.priority}: {task.title}</strong>
              <span>{task.ownerRole}</span>
              <p>{task.rationale}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3>Risks</h3>
        <ul>
          {plan.risks.map((risk) => (
            <li key={`${risk.severity}-${risk.title}`}>
              <strong>{risk.title}</strong>
              <span>{risk.severity}</span>
              <p>{risk.mitigation}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Owner checklist</h3>
        {plan.owner_checklist.map((checklist) => (
          <div className="structured-group" key={checklist.ownerRole}>
            <strong>{checklist.ownerRole}</strong>
            <ul>
              {checklist.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h3>Launch copy</h3>
        {plan.launch_copy.map((item) => (
          <div className="structured-copy" key={item.channel}>
            <strong>{item.channel}</strong>
            <p>{item.copy}</p>
          </div>
        ))}
      </section>

      {plan.follow_up_questions.length > 0 && (
        <section>
          <h3>Follow-up questions</h3>
          <ul>
            {plan.follow_up_questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      )}

      {fallbackText && (
        <details>
          <summary>Text response</summary>
          <pre>{fallbackText}</pre>
        </details>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
