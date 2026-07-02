import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, Megaphone, Radio, Send, ShieldCheck } from 'lucide-react';
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

function App() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<'idle' | 'streaming' | 'complete' | 'error'>('idle');
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [draft, setDraft] = useState('');
  const [finalText, setFinalText] = useState('');

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
          if (parsed.type === 'final' && parsed.text) setFinalText(parsed.text);
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
          <p>Turn a rough release idea into an actionable launch plan.</p>
        </div>
        <div className={`stream-pill ${status}`}>
          {status === 'streaming' ? <Loader2 size={16} className="spin" /> : <Radio size={16} />}
          {status === 'idle' ? 'Ready' : status === 'complete' ? 'Stream complete' : status === 'error' ? 'Needs attention' : 'Streaming'}
        </div>
      </header>

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
              {finalText || draft ? (
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

createRoot(document.getElementById('root')!).render(<App />);
