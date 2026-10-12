// The reader's contract. Section 2 of the digest plan builds against this file; the
// implementation lives in read-night.ts.

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: 'ok' | 'retry' | 'fail'; // status of the job's last line
  lastError: string | null; // most recent error seen for the job, null if none
  firstAt: string; // first line's `at`, offset kept as-is
  lastAt: string; // last line's `at`, offset kept as-is
};

// null = no such file; empty file = { rows: [], badLines: 0 }
export type Night = { rows: DigestRow[]; badLines: number };

export declare function readNight(runsDir: string, night: string): Night | null;
