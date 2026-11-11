// Preserve the deployed SQLite Durable Object class and its counters schema.
export class RateLimiterDO {
  private initialized = false;
  constructor(private state: DurableObjectState) {}
  private init() {
    if (this.initialized) return;
    this.state.storage.sql.exec(`CREATE TABLE IF NOT EXISTS counters (
      key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)`);
    this.initialized = true;
  }
  async fetch(request: Request) {
    this.init();
    let body: {key?: string; windowMs?: number; max?: number};
    try { body = await request.json(); } catch { return Response.json({error: 'Invalid request body'}, {status: 400}); }
    const {key, windowMs, max} = body;
    if (typeof key !== 'string' || !key || !Number.isSafeInteger(windowMs) || windowMs! <= 0 || !Number.isSafeInteger(max) || max! <= 0) {
      return Response.json({error: 'key, windowMs, and max are required'}, {status: 400});
    }
    const now = Date.now();
    const row = this.state.storage.sql.exec<{count: number; reset_at: number}>(
      'SELECT count, reset_at FROM counters WHERE key = ?', key).toArray()[0];
    let count = row && row.reset_at > now ? row.count : 0;
    const resetAt = row && row.reset_at > now ? row.reset_at : now + windowMs!;
    if (count >= max!) return Response.json({allowed: false, remaining: 0, resetAt});
    count++;
    this.state.storage.sql.exec(`INSERT INTO counters (key,count,reset_at) VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE SET count=excluded.count,reset_at=excluded.reset_at`, key, count, resetAt);
    const alarm = await this.state.storage.getAlarm();
    if (alarm === null || alarm > resetAt) await this.state.storage.setAlarm(resetAt);
    return Response.json({allowed: true, remaining: Math.max(0, max! - count), resetAt});
  }
  async alarm() {
    this.init();
    const now = Date.now();
    this.state.storage.sql.exec('DELETE FROM counters WHERE reset_at <= ?', now);
    const next = this.state.storage.sql.exec<{next: number | null}>('SELECT MIN(reset_at) AS next FROM counters').toArray()[0];
    if (next?.next && next.next > now) await this.state.storage.setAlarm(next.next);
  }
}
