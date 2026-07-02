import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });
dotenv.config();

const endpoint = process.env.LAUNCH_DESK_VERIFY_URL || 'http://127.0.0.1:8787/api/agent/launch-plan';

const payload = {
  productBrief:
    'Launch a beta-to-GA release for approval workflows. Engineering owns rollout and rollback, product owns metrics, support owns macros, and docs must publish before the announcement.',
  audience: 'Enterprise admins and engineering managers',
  launchDate: '2026-08-15',
  constraints: 'Security review required, use feature flags, avoid launch during regional support holiday.',
  assets: 'Beta feedback report, draft docs, demo video outline, customer quote.',
};

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing. Put it in .env.local or the shell environment.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream endpoint failed: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawToolProgress = false;
  let sawModelDelta = false;
  let sawFinal = false;
  let modelDeltaPreview = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      const event = JSON.parse(dataLine.slice(6)) as { type: string; text?: string; name?: string };
      if (event.type === 'tool_progress') sawToolProgress = true;
      if (event.type === 'model_delta' && event.text) {
        sawModelDelta = true;
        modelDeltaPreview += event.text;
      }
      if (event.type === 'final') sawFinal = true;
      if (event.type === 'error') throw new Error(event.text || 'Agent returned an error event.');
    }

    if (sawToolProgress && sawModelDelta && sawFinal) break;
  }

  console.log(
    JSON.stringify(
      {
        endpoint,
        sawToolProgress,
        sawModelDelta,
        sawFinal,
        modelDeltaPreview: modelDeltaPreview.slice(0, 120),
      },
      null,
      2,
    ),
  );

  if (!sawToolProgress || !sawModelDelta) {
    throw new Error('Expected at least one tool progress event and one model text delta.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
