import assert from "node:assert/strict";
const base = process.env.PROFILE_TEST_BASE || "http://localhost:8787/v1";
const auth = { Authorization: "Bearer mock-user-review" };
for (const path of ["/profiles/review-match-meera", "/profiles/search-by-id?userId=review-match-meera"]) {
  const response = await fetch(base + path, { headers: auth });
  assert.equal(response.status, 200);
  const { profile } = await response.json();
  for (const key of ["familyStatus", "fatherOccupation", "motherOccupation", "siblingCount", "birthDate", "birthTime", "partnerAgeRange", "partnerCaste", "partnerEducation", "partnerIncomeMin", "city", "state", "country"]) {
    assert.ok(Object.hasOwn(profile, key), key + " available without contact unlock");
  }
  for (const key of ["email", "phone", "address", "govtIdFile", "degreeFile", "paymentProofUrl", "role", "userStatus"]) assert.ok(!Object.hasOwn(profile, key), key + " withheld");
}
const anonymous = await (await fetch(base + "/profiles/review-match-meera")).json();
assert.ok(!Object.hasOwn(anonymous.profile, "birthDate"));
assert.ok(!Object.hasOwn(anonymous.profile, "partnerIncomeMin"));
console.log("PASS: complete signed-in biodata on both lookups; contact, documents and account metadata withheld; anonymous projection restricted.");
