import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePreferenceMatch, incomeInLakhs, parseAgeRange } from '../packages/shared/src/utils/matching.ts';

const viewer = { partnerAgeRange: '25 - 28 Yrs', partnerCaste: 'Brahmin', partnerIncomeMin: '₹15 LPA', partnerEducation: 'CA / CS' };
const candidate = { age: 27, caste: 'Brahmin', annualIncome: '₹20 - ₹30 LPA', highestDegree: 'Chartered Accountant (CA)' };

test('all explicit preferences produce a complete match', () => {
  const result = scorePreferenceMatch(viewer, candidate);
  assert.equal(result.score, 100);
  assert.equal(result.matchedCount, 4);
});
test('age range boundaries are inclusive', () => {
  for (const age of [25, 28]) assert.equal(scorePreferenceMatch(viewer, { ...candidate, age }).score, 100);
  assert.equal(scorePreferenceMatch(viewer, { ...candidate, age: 29 }).score, 65);
});
test('caste uses selected preferences, exact normalized names, and multiple options', () => {
  assert.equal(scorePreferenceMatch({ partnerCaste: 'Reddy, BRAHMIN / Jain' }, candidate).score, 100);
  assert.equal(scorePreferenceMatch({ partnerCaste: 'Brah' }, candidate).score, 0);
  assert.equal(scorePreferenceMatch({ partnerCaste: 'Jain', caste: 'Brahmin' }, candidate).score, 0);
});
test('income range lower bound must meet the minimum', () => {
  assert.equal(scorePreferenceMatch(viewer, { ...candidate, annualIncome: '₹10 - ₹15 LPA' }).score, 75);
  assert.equal(scorePreferenceMatch(viewer, { ...candidate, annualIncome: '₹15 - ₹20 LPA' }).score, 100);
});
test('income units and annual rupees are normalized', () => {
  assert.equal(incomeInLakhs('₹1.2 crore'), 120);
  assert.equal(incomeInLakhs('INR 15,00,000'), 15);
  assert.equal(incomeInLakhs('₹30 LPA+'), 30);
  assert.equal(incomeInLakhs('15 lakhs'), 15);
  for (const value of ['', 'Not shared', 'USD 150000', '₹50000 per month', '15']) assert.equal(incomeInLakhs(value), null);
});
test('unknown income is labelled unknown and earns no points', () => {
  const result = scorePreferenceMatch(viewer, { ...candidate, annualIncome: '' });
  assert.equal(result.score, 75);
  assert.equal(result.factors.find(f => f.key === 'income').status, 'unknown');
});
test('open preferences do not penalize a profile', () => {
  assert.equal(scorePreferenceMatch({ ...viewer, partnerCaste: 'Open to All' }, { ...candidate, caste: 'Jain' }).score, 100);
  assert.equal(scorePreferenceMatch({}, candidate).score, null);
  assert.deepEqual(scorePreferenceMatch({}, candidate).factors, []);
});
test('snake_case stored profiles and camelCase client profiles agree', () => {
  assert.deepEqual(scorePreferenceMatch({ partner_age_range: viewer.partnerAgeRange, partner_caste: viewer.partnerCaste, partner_income_min: viewer.partnerIncomeMin, partner_education: viewer.partnerEducation }, { age: 27, caste: 'Brahmin', annual_income: candidate.annualIncome, highest_degree: candidate.highestDegree }), scorePreferenceMatch(viewer, candidate));
});
test('education uses qualification tokens, not incidental ca substrings', () => {
  assert.equal(scorePreferenceMatch({ partnerEducation: 'CA' }, { highestDegree: 'Medical Doctor' }).score, 0);
  assert.equal(scorePreferenceMatch({ partnerEducation: 'CS / CA' }, { highestDegree: 'Company Secretary (CS)' }).score, 100);
});
test('invalid and reversed age ranges are not silently scored', () => {
  for (const value of ['28 - 25', '17 - 28', '25', 'not specified', '25 - 101']) assert.equal(parseAgeRange(value), null);
  assert.deepEqual(parseAgeRange('25–28 years'), [25, 28]);
});
test('changing saved preferences changes ranking', () => {
  const a = { ...candidate, age: 30, caste: 'Jain' }, b = candidate;
  assert.ok(scorePreferenceMatch(viewer, b).score > scorePreferenceMatch(viewer, a).score);
  const changed = { ...viewer, partnerAgeRange: '29 - 32', partnerCaste: 'Jain' };
  assert.ok(scorePreferenceMatch(changed, a).score > scorePreferenceMatch(changed, b).score);
});

const { normalizeCandidateProfile } = await import('../packages/shared/src/utils/profile.ts');
const { safeNextPath } = await import('../apps/web/src/lib/auth-routing.ts');
test('profile boundary accepts both deployed response shapes without missing identifiers', () => {
  const legacy = normalizeCandidateProfile({ user_id: 'member-42', full_name: 'Member Name', highest_degree: 'CA', annual_income: '₹20 LPA', work_location: 'Mumbai', photos: '["https://example.test/photo.jpg"]', is_verified: 1 });
  assert.equal(legacy.userId, 'member-42');
  assert.equal(legacy.fullName, 'Member Name');
  assert.equal(legacy.highestDegree, 'CA');
  assert.equal(legacy.annualIncome, '₹20 LPA');
  assert.equal(legacy.isVerified, true);
  assert.equal(normalizeCandidateProfile({ userId: 'new-42', photos: null }).userId, 'new-42');
});
test('missing fields and malformed photos remain renderable', () => {
  for (const photos of ['bad json', '{}', null, ['javascript:alert(1)', null]]) {
    const profile = normalizeCandidateProfile({ photos });
    assert.equal(profile.userId, '');
    assert.equal(profile.occupation.split(',')[0], '');
    assert.deepEqual(profile.photos, []);
  }
});
test('authentication redirects preserve internal intent and reject external paths', () => {
  assert.equal(safeNextPath('/dashboard?gender=Female&ageMin=26'), '/dashboard?gender=Female&ageMin=26');
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/\n/evil.test', 'javascript:alert(1)']) assert.equal(safeNextPath(value), null);
});
