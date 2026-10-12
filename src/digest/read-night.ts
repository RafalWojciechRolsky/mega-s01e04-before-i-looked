import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night } from './types.js';

type RunLine = {
  at: string;
  job: string;
  status: DigestRow['lastStatus'];
  owner: string | null;
  error?: string;
};

function isStatus(value: unknown): value is DigestRow['lastStatus'] {
  return value === 'ok' || value === 'retry' || value === 'fail';
}

// Parse at the edge: one JSON object per line, anything else is null (a bad line).
function parseLine(raw: string): RunLine | null {
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v.at !== 'string' || typeof v.job !== 'string' || !isStatus(v.status)) return null;
    return {
      at: v.at,
      job: v.job,
      status: v.status,
      owner: typeof v.owner === 'string' ? v.owner : null,
      error: typeof v.error === 'string' ? v.error : undefined,
    };
  } catch {
    return null;
  }
}

// Fold one line into the job's row: counts add up, the tail of the row follows the last line,
// and an owner once known is never lost to a later null.
function addLine(row: DigestRow | undefined, line: RunLine): DigestRow {
  if (!row) {
    return {
      job: line.job,
      owner: line.owner,
      runs: 1,
      retries: line.status === 'retry' ? 1 : 0,
      lastStatus: line.status,
      lastError: line.error ?? null,
      firstAt: line.at,
      lastAt: line.at,
    };
  }
  return {
    ...row,
    owner: line.owner ?? row.owner,
    runs: row.runs + 1,
    retries: row.retries + (line.status === 'retry' ? 1 : 0),
    lastStatus: line.status,
    lastError: line.error ?? row.lastError,
    lastAt: line.at,
  };
}

// Sorted by job, so the page and the JSON read the same order by construction.
function byJob(a: DigestRow, b: DigestRow): number {
  if (a.job === b.job) return 0;
  return a.job < b.job ? -1 : 1;
}

// Blank lines (a trailing newline, say) are nothing, not bad lines: only content that fails to
// parse is counted.
function fold(text: string): Night {
  const byName = new Map<string, DigestRow>();
  let badLines = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines += 1;
      continue;
    }
    byName.set(line.job, addLine(byName.get(line.job), line));
  }
  return { rows: [...byName.values()].sort(byJob), badLines };
}

export function readNight(runsDir: string, night: string): Night | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  return fold(text);
}
