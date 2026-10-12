import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read-night.js';

const tempDirs: string[] = [];

function tempRuns(night: string, text: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  tempDirs.push(dir);
  writeFileSync(join(dir, `${night}.jsonl`), text);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('readNight', () => {
  it('reads the night of 2026-10-28 into one sorted row per job', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    expect(night?.badLines).toBe(1);
    expect(night?.rows).toEqual([
      {
        job: 'digest/render',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-29T05:41:09+01:00',
        lastAt: '2026-10-29T05:41:09+01:00',
      },
      {
        job: 'fixtures/refresh',
        owner: 'rook',
        runs: 4,
        retries: 3,
        lastStatus: 'ok',
        lastError: 'upstream 503',
        firstAt: '2026-10-29T01:30:00+01:00',
        lastAt: '2026-10-29T01:37:00+01:00',
      },
      {
        job: 'lane/sync',
        owner: 'rook',
        runs: 8,
        retries: 1,
        lastStatus: 'ok',
        lastError: 'lock held',
        firstAt: '2026-10-28T23:00:06+01:00',
        lastAt: '2026-10-29T05:00:04+01:00',
      },
      {
        job: 'notes/backup',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'quota exceeded',
        firstAt: '2026-10-29T04:00:01+01:00',
        lastAt: '2026-10-29T04:00:01+01:00',
      },
      {
        job: 'rig/rotate-logs',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-28T23:00:02+01:00',
        lastAt: '2026-10-28T23:00:02+01:00',
      },
    ]);
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('/nonexistent', '2026-10-28')).toBeNull();
  });

  it('returns no rows for an empty file', () => {
    const dir = tempRuns('2026-10-30', '');
    expect(readNight(dir, '2026-10-30')).toEqual({ rows: [], badLines: 0 });
  });

  it('counts a bad line and still renders the night', () => {
    const dir = tempRuns(
      '2026-10-31',
      [
        '{"at":"2026-10-31T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
        'not json at all',
        '{"at":"2026-10-31T02:00:00+01:00","job":"lane/sync","status":"fail","owner":null,"error":"boom"}',
        '{"job":"no/at","status":"ok","owner":"rook"}',
      ].join('\n'),
    );
    expect(readNight(dir, '2026-10-31')).toEqual({
      rows: [
        {
          job: 'lane/sync',
          owner: 'rook',
          runs: 2,
          retries: 0,
          lastStatus: 'fail',
          lastError: 'boom',
          firstAt: '2026-10-31T01:00:00+01:00',
          lastAt: '2026-10-31T02:00:00+01:00',
        },
      ],
      badLines: 2,
    });
  });

  it('does not count a trailing newline as a bad line', () => {
    const dir = tempRuns(
      '2026-11-01',
      '{"at":"2026-11-01T01:00:00+01:00","job":"lane/sync","status":"retry","owner":null,"error":"lock held"}\n',
    );
    const night = readNight(dir, '2026-11-01');
    expect(night?.badLines).toBe(0);
    expect(night?.rows).toEqual([
      {
        job: 'lane/sync',
        owner: null,
        runs: 1,
        retries: 1,
        lastStatus: 'retry',
        lastError: 'lock held',
        firstAt: '2026-11-01T01:00:00+01:00',
        lastAt: '2026-11-01T01:00:00+01:00',
      },
    ]);
  });
});
