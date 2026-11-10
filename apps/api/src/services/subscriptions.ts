/** SQLite normalizes both legacy SQL timestamps and ISO timestamps before comparison. */
export const ACTIVE_SUBSCRIPTION_SQL = `status = 'active'
  AND julianday(start_date) <= julianday('now') AND julianday(end_date) > julianday('now')`;

export async function currentSubscription(db: D1Database, userId: string) {
  return db.prepare(`SELECT us.*, p.name AS package_name, p.validity_days, p.contact_limit
    FROM user_subscriptions us LEFT JOIN packages p ON p.id = us.package_id
    WHERE us.user_id = ? ORDER BY
      CASE WHEN us.${ACTIVE_SUBSCRIPTION_SQL} THEN 0 ELSE 1 END,
      julianday(us.start_date) DESC, us.id DESC LIMIT 1`).bind(userId).first<any>();
}

export function subscriptionView(row: any, now = Date.now()) {
  if (!row) return null;
  const parse = (value: string) => Date.parse(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  const valid = Number.isFinite(parse(row.start_date)) && Number.isFinite(parse(row.end_date));
  const started = valid && parse(row.start_date) <= now;
  const expired = !valid || parse(row.end_date) <= now;
  const isActive = row.status === 'active' && started && !expired;
  const status = row.status === 'active' ? expired ? 'expired' : started ? 'active' : 'scheduled' : row.status;
  return {...row, status, packageId: row.package_id, planName: row.package_name,
    renewalDate: row.end_date, expiresAt: row.end_date, startsAt: row.start_date,
    creditsGranted: row.credits_granted, contactLimitBalance: isActive ? Math.max(0,row.contact_limit_balance || 0) : 0,
    contact_limit_balance: isActive ? Math.max(0,row.contact_limit_balance || 0) : 0,
    isActive};
}
