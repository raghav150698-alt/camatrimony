export function minimumProfileAge(gender: unknown): number {
  return typeof gender === "string" && gender.trim().toLowerCase() === "male" ? 21 : 18;
}

export function validateProfileAge(age: unknown, gender: unknown): string | null {
  if (typeof gender !== "string" || !["male", "female"].includes(gender.trim().toLowerCase())) {
    return "Select a gender before entering age.";
  }
  const minimum = minimumProfileAge(gender);
  const number = typeof age === "number" || typeof age === "string" ? Number(age) : NaN;
  if (!Number.isInteger(number) || number < minimum || number > 70) {
    return `Age must be a whole number between ${minimum} and 70.`;
  }
  return null;
}

export function validateProfileDegree(degree: unknown): string | null {
  if (typeof degree !== "string" || degree.trim().length < 2 || degree.trim().toLowerCase() === "other") {
    return "Select a qualification or enter your qualification under Other.";
  }
  if (degree.trim().length > 120) return "Qualification must be 120 characters or fewer.";
  return null;
}
