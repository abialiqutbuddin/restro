// utils/dates.ts
export function toDateStrict(v: string | number | Date): Date {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) throw new Error('Invalid Date instance');
    return v;
  }
  if (typeof v === 'number') {
    const d = new Date(v);
    if (isNaN(d.getTime())) throw new Error('Invalid epoch milliseconds');
    return d;
  }
  // string
  // If it looks like "YYYY-MM-DD HH:mm:ss.SSS", make it ISO by inserting 'T' and appending 'Z' (UTC)
  const trimmed = v.trim();
  const looksSqlish = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed);
  const isoCandidate = looksSqlish
    ? trimmed.replace(' ', 'T') + 'Z'
    : trimmed; // assume it might already be ISO like "2025-10-29T18:11:12.698Z"

  const d = new Date(isoCandidate);
  if (isNaN(d.getTime())) throw new Error(`Invalid date string: ${v}`);
  return d;
}

// src/utils/date_keep_wall.ts
export function toDateKeepWall(input: string): Date {
  // Accepts: "YYYY-MM-DD HH:mm:ss" or "...ss.SSS"
  const m = input.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/
  );
  if (!m) throw new Error(`Bad wall time format: ${input}`);

  const [_, y, mo, d, hh, mm, ss, ms] = m;
  return new Date(Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss),
    ms ? Number(ms.padEnd(3, '0')) : 0
  ));
}