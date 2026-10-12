import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/read-night.js';
import type { Night } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

// A night's jobs by their last status: the same reader the digest page uses, so the board and
// the page never disagree.
export type NightCounts = {
  ok: number;
  retry: number;
  fail: number;
};

// counts is null when the night's log could not be read (the file names something readNight
// will not open).
export type NightOnDisk = {
  night: string;
  counts: NightCounts | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightOnDisk[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// A job counts once, as its last status of the night: one ok, retry or fail per row.
function countsFor(night: Night): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of night.rows) counts[row.lastStatus] += 1;
  return counts;
}

function nightOnDisk(runsDir: string, night: string): NightOnDisk {
  const log = readNight(runsDir, night);
  return { night, counts: log ? countsFor(log) : null };
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((night) => nightOnDisk(config.runsDir, night)),
  };
}
