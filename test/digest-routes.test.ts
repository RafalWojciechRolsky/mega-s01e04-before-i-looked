import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

// runs/ holds real nights and stays read-only in tests: every route test gets its own temp dir.
const tempDirs: string[] = [];

function tempRuns(night: string, text: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  tempDirs.push(dir);
  writeFileSync(join(dir, `${night}.jsonl`), text);
  return dir;
}

function emptyRuns(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function app(runsDir: string) {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

// The page's job column, one entry per body row, in render order.
function jobsOnPage(html: string): string[] {
  return [...html.matchAll(/<tr(?: class="warn")?><td>([^<]+)<\/td>/g)].map((m) => m[1]);
}

type DigestJson = { night: string; rows: DigestRow[]; badLines: number };

const NIGHT = '2026-11-02';

const DATA_LINES = [
  '{"at":"2026-11-02T01:00:00+01:00","job":"lane/sync","status":"retry","owner":"rook","error":"lock held"}',
  '{"at":"2026-11-02T01:05:00+01:00","job":"lane/sync","status":"retry","owner":"rook","error":"lock held"}',
  '{"at":"2026-11-02T02:00:00+01:00","job":"alpha","status":"ok","owner":null}',
  '{"at":"2026-11-02T03:00:00+01:00","job":"notes/backup","status":"fail","owner":"lane-07","error":"quota exceeded"}',
].join('\n');

describe('digest routes', () => {
  it('renders the rows of a night with data', async () => {
    const res = await app(tempRuns(NIGHT, DATA_LINES)).request(`/digest/${NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(`<h1>${NIGHT}</h1>`);
    expect(jobsOnPage(html)).toEqual(['alpha', 'lane/sync', 'notes/backup']);
    // Missing data renders as an em dash, never as an empty cell (styleguide).
    expect(html).toContain('<td>—</td>');
    // Three or more retries and any fail earn the warn mark; an ok row does not.
    const rows = html.split('<tr');
    expect(rows.find((r) => r.includes('notes/backup'))).toContain('class="warn"');
    expect(rows.find((r) => r.includes('alpha'))).not.toContain('class="warn"');
  });

  it('answers the JSON route with the night, its rows and its bad line count', async () => {
    const res = await app(tempRuns(NIGHT, DATA_LINES)).request(`/api/digest/${NIGHT}`);
    const body = (await res.json()) as DigestJson;
    expect(res.status).toBe(200);
    expect(body.night).toBe(NIGHT);
    expect(body.badLines).toBe(0);
    expect(body.rows).toEqual([
      {
        job: 'alpha',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-11-02T02:00:00+01:00',
        lastAt: '2026-11-02T02:00:00+01:00',
      },
      {
        job: 'lane/sync',
        owner: 'rook',
        runs: 2,
        retries: 2,
        lastStatus: 'retry',
        lastError: 'lock held',
        firstAt: '2026-11-02T01:00:00+01:00',
        lastAt: '2026-11-02T01:05:00+01:00',
      },
      {
        job: 'notes/backup',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'quota exceeded',
        firstAt: '2026-11-02T03:00:00+01:00',
        lastAt: '2026-11-02T03:00:00+01:00',
      },
    ]);
  });

  it('returns 404 on both routes for a night with no file', async () => {
    const runsDir = emptyRuns();
    const page = await app(runsDir).request('/digest/2026-01-01');
    expect(page.status).toBe(404);
    expect(await page.text()).toBe('no run log for that night');

    const json = await app(runsDir).request('/api/digest/2026-01-01');
    expect(json.status).toBe(404);
    expect(await json.json()).toEqual({ error: 'no run log for that night' });
  });

  it('renders the empty night as "nothing ran" and as empty JSON', async () => {
    const runsDir = tempRuns(NIGHT, '');

    const page = await app(runsDir).request(`/digest/${NIGHT}`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');

    const json = await app(runsDir).request(`/api/digest/${NIGHT}`);
    expect(json.status).toBe(200);
    expect(await json.json()).toEqual({ night: NIGHT, rows: [], badLines: 0 });
  });

  it('still renders a night with a bad line and counts it in the JSON', async () => {
    const runsDir = tempRuns(
      NIGHT,
      [
        '{"at":"2026-11-02T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
        'not json at all',
        '',
        '{"job":"no/at","status":"ok","owner":"rook"}',
      ].join('\n'),
    );

    const page = await app(runsDir).request(`/digest/${NIGHT}`);
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(jobsOnPage(html)).toEqual(['lane/sync']);
    expect(html).toContain('2 bad lines in the log');

    const json = await app(runsDir).request(`/api/digest/${NIGHT}`);
    const body = (await json.json()) as DigestJson;
    expect(json.status).toBe(200);
    expect(body.badLines).toBe(2);
    expect(body.rows.map((row) => row.job)).toEqual(['lane/sync']);
  });

  it('keeps the page and the JSON in agreement on the same night', async () => {
    const runsDir = tempRuns(NIGHT, DATA_LINES);
    const page = await app(runsDir).request(`/digest/${NIGHT}`);
    const json = await app(runsDir).request(`/api/digest/${NIGHT}`);
    const html = await page.text();
    const body = (await json.json()) as DigestJson;

    // ADR 0001: the page and the JSON must never disagree, down to the order.
    expect(jobsOnPage(html)).toEqual(body.rows.map((row) => row.job));
    expect(body.night).toBe(NIGHT);
  });
});
