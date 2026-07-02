import dotenv from 'dotenv';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

dotenv.config({ path: '.env.local', override: true });
dotenv.config();

const frontendUrl = process.env.LAUNCH_DESK_FRONTEND_URL || 'http://127.0.0.1:5173';
const screenshotPath = 'artifacts/launch-desk-ui-flow.png';

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(frontendUrl, { waitUntil: 'networkidle' });

    await page.getByLabel('Product brief').fill(
      [
        'Launch team workspace templates for enterprise engineering organizations.',
        'The release includes curated launch, incident, and planning templates with admin controls, onboarding docs, and usage analytics.',
        'Engineering owns rollout and rollback, product owns adoption metrics, support owns customer macros, and docs must publish before launch.',
      ].join(' '),
    );
    await page.getByLabel('Audience').fill('Enterprise engineering managers and platform admins');
    await page.getByLabel('Launch date').fill('2026-09-10');
    await page
      .getByLabel('Constraints')
      .fill('Security review required, feature-flagged rollout, no customer downtime, support coverage required.');
    await page
      .getByLabel('Available assets')
      .fill('Docs draft, beta feedback report, demo recording outline, customer quote, support FAQ.');

    await page.getByRole('button', { name: 'Generate release plan' }).click();

    await page.locator('.tool-step.done').first().waitFor({ state: 'visible', timeout: 120_000 });
    await page.locator('.agent-output pre').waitFor({ state: 'visible', timeout: 120_000 });
    await page.getByText('Stream complete').waitFor({ state: 'visible', timeout: 180_000 });

    const finalOutput = (await page.locator('.agent-output pre').textContent()) ?? '';
    if (!finalOutput.includes('Prioritized') && !finalOutput.includes('plan')) {
      throw new Error('Final output did not contain expected launch plan text.');
    }

    const pageText = await page.locator('body').textContent();
    if (process.env.OPENAI_API_KEY && pageText?.includes(process.env.OPENAI_API_KEY)) {
      throw new Error('Page DOM exposed the configured API key value.');
    }

    await mkdir('artifacts', { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log(
      JSON.stringify(
        {
          frontendUrl,
          screenshotPath,
          progressRailUpdated: true,
          streamingOutputAppeared: true,
          finalOutputRendered: true,
          secretExposureCheckPassed: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
