import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/read-night.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

// A night is a date and nothing else; anything else cannot name a file in runs/.
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  // One guard, one reader: the page and the JSON can never disagree about a night.
  const nightDigest = (night: string) =>
    NIGHT.test(night) ? readNight(config.runsDir, night) : null;

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = nightDigest(night);
    if (!digest) return c.text('no run log for that night', 404);
    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestPage night={night} digest={digest} />
      </Layout>,
    );
  });

  // The same rows the page renders, for agents to read.
  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = nightDigest(night);
    if (!digest) return c.json({ error: 'no run log for that night' }, 404);
    return c.json({ night, rows: digest.rows, badLines: digest.badLines });
  });

  return app;
}
