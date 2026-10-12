---
plan: morning-digest
status: done
owner: rook
opened: 2026-10-29
closed: 2026-10-29
---

# Morning digest

The night's run log is a JSONL file nobody reads. By breakfast someone has to know what ran,
what retried, what failed, and whose it was, without opening `runs/`. rig already serves the
status board; the digest is one more page on it.

Out of scope: notifications, history across nights, auth (rig only listens on localhost).

## 1. Run log reader

`src/digest/types.ts` + the reader in `src/digest/`. A bad line is counted, never thrown;
`owner` may be null.

Done when: reader tests pass on `runs/2026-10-28.jsonl` (5 jobs, 1 bad line).

## 2. Digest page

- 2a `GET /digest/:night` — one table, sorted by job; retries of 3+ and any `fail` marked; 404 on no file; "nothing ran" on empty.
- 2b `GET /api/digest/:night` — the same rows as JSON; page and JSON share one reader and one guard (ADR 0001).
- 2c board link — each night on disk links to its digest with ok / retry / fail counts.
- 2d route tests — 200, 404, empty night, bad line; page/JSON agreement.

Done when: `/digest/2026-10-28` renders locally; `pnpm test` green with the new tests.

## 3. Preview for review

`/digest/2026-10-28` saved as one self-contained HTML file and put behind a public HTTPS link;
Rook reviews from the copy, not the lane.

Done when: the preview link is sent to Rook.

## 4. Clean up

Delete the preview object; the link must stop resolving. Move this plan to `docs/plans/done/`
with its issue list (ADR 0003).

Done when: the preview link returns nothing.

## Issues

| # | Issue | Blocked by | Worker | Closed |
|---|-------|-----------|--------|--------|
| 1 | Run log reader | — | droid · deepseek-v4.1-flash · medium | 2026-10-29 |
| 2 | Digest page | #1 | droid · deepseek-v4.1-flash · medium | 2026-10-29 |
| 3 | Digest JSON | #1 | droid · deepseek-v4.1-flash · medium | 2026-10-29 |
| 4 | Board link | #2 | droid · deepseek-v4.1-flash · medium | 2026-10-29 |
| 5 | Route tests | #2, #3 | droid · deepseek-v4.1-flash · medium | 2026-10-29 |
| 6 | Preview for review | #2 | droid · deepseek-v4.1-flash · medium | 2026-10-29 |
| 7 | Clean up | #6 | droid · deepseek-v4.1-flash · medium | 2026-10-29 |

The preview was reviewed and taken down the same day. See ADR 0003.
