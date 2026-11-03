// Integration tests against LOCAL fixtures only. Restore changed preferences in finally.
import assert from 'node:assert/strict';
const base = 'http://localhost:8787/v1';
const headers = { Authorization: 'Bearer mock-user-review', 'Content-Type': 'application/json' };
async function request(path, method = 'GET', body, auth = true) {
  const res = await fetch(base + path, { method, headers: auth ? headers : {}, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
const original = (await request('/profile')).body.profile;
assert.ok(original?.fullName, 'local fixtures must be seeded');
try {
  const all = await request('/profiles?sortBy=recommended&limit=50');
  assert.equal(all.status, 200);
  assert.equal(all.body.profiles.length, 10);
  assert.ok(all.body.profiles.every(p => p.gender === 'Female' && p.userId !== 'mock-user-review'));
  const otherSort = (await request('/profiles?sortBy=verified_first')).body.profiles;
  assert.ok(otherSort.every(p => p.gender === 'Female'), 'changing sort should retain the matching pool');
  const scores = all.body.profiles.map(p => p.match.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  for (const p of all.body.profiles) {
    for (const key of ['email', 'phone', 'govtIdFile', 'degreeFile', 'paymentProofUrl', 'address', 'partnerIncomeMin']) assert.ok(!(key in p), `private field ${key}`);
  }
  const first = (await request('/profiles?sortBy=recommended&limit=3&page=1')).body;
  const second = (await request('/profiles?sortBy=recommended&limit=3&page=2')).body;
  assert.deepEqual([...first.profiles, ...second.profiles].map(p => p.userId), all.body.profiles.slice(0, 6).map(p => p.userId));
  assert.equal((await request('/profiles?sortBy=recommended', 'GET', undefined, false)).status, 401);
  assert.equal((await request('/profiles?sortBy=recommended&minAge=40&maxAge=20')).status, 400);
  const filtered = (await request('/profiles?sortBy=recommended&location=Mumbai')).body.profiles;
  assert.ok(filtered.length && filtered.every(p => p.workLocation.includes('Mumbai')));
  const changed = await request('/profile', 'POST', { ...original, partnerAgeRange: '29 - 32 Yrs', partnerCaste: 'Nair', partnerIncomeMin: '₹15 LPA', partnerEducation: 'CS' });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  const reranked = (await request('/profiles?sortBy=recommended&limit=3')).body.profiles;
  assert.equal(reranked[0].userId, 'review-match-priya');
  assert.equal(reranked[0].match.score, 100);
  const target = 'review-match-meera';
  assert.equal((await request('/favorites', 'POST', { favoritedUserId: target })).status, 200);
  assert.ok((await request('/favorites')).body.favorites.some(p => p.user_id === target));
  assert.equal((await request(`/favorites?favoritedUserId=${target}`, 'DELETE')).status, 200);
  console.log('PASS: ranking, pagination, preference persistence, filters, privacy, auth and shortlist');
} finally {
  const restored = await request('/profile', 'POST', original);
  assert.equal(restored.status, 200, 'restore review preferences');
}

