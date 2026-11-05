import assert from "node:assert/strict";
const base = process.env.PROFILE_TEST_BASE || "http://localhost:8788/v1";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Local fixture API only");
async function api(method, body) {
  const response = await fetch(base + "/profile", { method, headers: { Authorization: "Bearer mock-user-review", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
}
const original = (await api("GET")).data.profile;
assert.equal(original.userId, "mock-user-review");
try {
  assert.equal((await api("POST", { gender: "Male", age: 20 })).status, 400);
  assert.equal((await api("POST", { gender: "Male", age: 21 })).status, 200);
  assert.equal((await api("POST", { gender: "Female", age: 17 })).status, 400);
  assert.equal((await api("POST", { gender: "Female", age: 18 })).status, 200);
  assert.equal((await api("POST", { gender: "Male" })).status, 400, "gender-only update cannot bypass age rule");
  assert.equal((await api("POST", { age: 18.5 })).status, 400);
  assert.equal((await api("POST", { highestDegree: "Other" })).status, 400);
  assert.equal((await api("POST", { highest_degree: "Master of Public Health" })).status, 200);
  assert.equal((await api("GET")).data.profile.highestDegree, "Master of Public Health");
  assert.equal((await api("POST", { highestDegree: "B.Com" })).status, 200);
  assert.equal((await api("GET")).data.profile.highestDegree, "B.Com");
  console.log("PASS: minimum ages, gender changes, custom degrees and preset degrees persist correctly.");
} finally {
  const restored = await api("POST", { age: original.age, gender: original.gender, highestDegree: original.highestDegree });
  assert.equal(restored.status, 200, "restore local review profile");
}
