import dotenv from 'dotenv';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

dotenv.config({ path: '.env.local', override: true });
dotenv.config();

const frontendUrl = process.env.LAUNCH_DESK_FRONTEND_URL || 'http://127.0.0.1:5173';
const apiBaseUrl = process.env.LAUNCH_DESK_API_URL || 'http://127.0.0.1:8787';
const streamEndpoint = `${apiBaseUrl}/api/agent/launch-plan`;
const screenshotPath = 'artifacts/launch-desk-smoke.png';

const payload = {
  productBrief:
    'Launch approval workflows from beta to GA with engineering owners, QA, rollback, product metrics, support macros, and docs readiness.',
  audience: 'Enterprise admins and engineering managers',
  launchDate: '2026-08-15',
  constraints: 'Security review required, use feature flags, and avoid support holiday windows.',
  assets: 'Beta feedback report, draft docs, demo video outline, customer quote.',
};

async function verifyFrontend() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(frontendUrl, { waitUntil: 'networkidle' });
    const heading = await page.getByRole('heading', { name: 'Launch Desk' }).textContent();
    if (heading !== 'Launch Desk') throw new Error('Frontend heading did not render.');
    await mkdir('artifacts', { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } finally {
    await browser.close();
  }
}

async function verifyHealth() {
  const response = await fetch(`${apiBaseUrl}/api/health`);
  const text = await response.text();
  if (!response.ok) throw new Error(`Health check failed: HTTP ${response.status}`);
  const body = JSON.parse(text) as { ok?: boolean; hasOpenAIKey?: boolean; OPENAI_API_KEY?: string };
  if (!body.ok) throw new Error('Health response did not report ok=true.');
  if (body.OPENAI_API_KEY !== undefined) throw new Error('Health response exposed an API key field.');
  if (process.env.OPENAI_API_KEY && text.includes(process.env.OPENAI_API_KEY)) {
    throw new Error('Health response exposed the configured API key value.');
  }
}

async function verifyStream() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing. Put it in .env.local or the shell environment.');
  }

  const response = await fetch(streamEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) throw new Error(`Stream failed: HTTP ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawToolProgress = false;
  let sawModelDelta = false;
  let sawFinal = false;

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
      if (event.type === 'model_delta' && event.text) sawModelDelta = true;
      if (event.type === 'final' && event.text) sawFinal = true;
      if (event.type === 'error') throw new Error(event.text || 'Agent returned an error event.');
    }

    if (sawToolProgress && sawModelDelta && sawFinal) break;
  }

  if (!sawToolProgress || !sawModelDelta || !sawFinal) {
    throw new Error('Expected tool_progress, model_delta, and final events.');
  }

  return { sawToolProgress, sawModelDelta, sawFinal };
}

async function main() {
  await verifyFrontend();
  await verifyHealth();
  const stream = await verifyStream();

  console.log(
    JSON.stringify(
      {
        frontendUrl,
        apiBaseUrl,
        screenshotPath,
        ...stream,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
