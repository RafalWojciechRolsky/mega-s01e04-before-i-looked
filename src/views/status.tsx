import type { NightOnDisk, Status } from '../status.js';

// The night's jobs by last status, or an em dash when the log could not be read (styleguide:
// missing data renders as —, never as an empty cell).
function counts(night: NightOnDisk): string {
  if (!night.counts) return '—';
  const { ok, retry, fail } = night.counts;
  return `${ok} ok · ${retry} retry · ${fail} fail`;
}

export function StatusBoard({ status }: { status: Status }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((n) => (
            <li>
              <a href={`/digest/${n.night}`}>{n.night}</a> <span class="mute">{counts(n)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
