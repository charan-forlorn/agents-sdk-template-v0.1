import { describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';

describe('api health', () => {
  it('returns service status without exposing the API key value', async () => {
    const previousApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'unit-test-secret-value';
    const app = createApp();
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
    });

    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected a TCP test server address.');

      const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.service).toBe('launch-desk-api');
      expect(body.hasOpenAIKey).toBe(true);
      expect(body.OPENAI_API_KEY).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('unit-test-secret-value');
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previousApiKey;
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
