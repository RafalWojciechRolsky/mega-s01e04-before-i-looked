import type { DigestRow, Night } from '../digest/types.js';

// Missing data renders as an em dash, never as an empty cell (styleguide).
function value(text: string | null): string {
  return text ?? '—';
}

// A row earns the warn mark on the night's own terms: three or more retries, or a failure.
function warns(row: DigestRow): boolean {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestPage({ night, digest }: { night: string; digest: Night }) {
  return (
    <>
      <h1>{night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first → last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr class={warns(row) ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{value(row.owner)}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{value(row.lastError)}</td>
                <td>{`${row.firstAt} → ${row.lastAt}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 && (
        <p class="mute">
          {digest.badLines} bad {digest.badLines === 1 ? 'line' : 'lines'} in the log
        </p>
      )}
    </>
  );
}
