import 'dotenv/config';
import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config({ path: '.env.local', override: true });

const app = createApp();
const port = Number(process.env.PORT || 8787);

app.listen(port, '127.0.0.1', () => {
  console.log(`Launch Desk API listening on http://127.0.0.1:${port}`);
});
