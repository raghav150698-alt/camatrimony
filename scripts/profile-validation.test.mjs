import test from "node:test";
import assert from "node:assert/strict";
import { validateProfileAge, validateProfileDegree, minimumProfileAge } from "../packages/shared/src/utils/profile-validation.ts";

test("women can register at 18, but not 17", () => {
  assert.equal(minimumProfileAge("Female"), 18);
  assert.equal(validateProfileAge(18, "Female"), null);
  assert.ok(validateProfileAge(17, "Female"));
});
test("men can register at 21, but not 20 or 18", () => {
  assert.equal(minimumProfileAge("Male"), 21);
  assert.equal(validateProfileAge("21", "Male"), null);
  assert.ok(validateProfileAge(20, "Male"));
  assert.ok(validateProfileAge(18, "Male"));
});
test("changing a woman's gender to male revalidates her age", () => {
  assert.equal(validateProfileAge(18, "Female"), null);
  assert.ok(validateProfileAge(18, "Male"));
});
test("age requires a known gender and whole years within the supported limit", () => {
  for (const value of ["", null, undefined, 21.5, 71, Infinity, {}, true]) assert.ok(validateProfileAge(value, "Male"));
  assert.ok(validateProfileAge(25, ""));
  assert.equal(validateProfileAge(70, "Female"), null);
  assert.equal(validateProfileAge(70, "Male"), null);
});
test("custom qualifications are allowed but empty Other and oversized values are rejected", () => {
  assert.equal(validateProfileDegree("Master of Public Health"), null);
  assert.equal(validateProfileDegree("B.Com"), null);
  assert.equal(validateProfileDegree("CA"), null);
  for (const value of ["", "  ", "Other", " other ", "x", "x".repeat(121), null]) assert.ok(validateProfileDegree(value));
});
