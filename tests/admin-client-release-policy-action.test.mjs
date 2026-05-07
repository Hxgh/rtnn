import assert from "node:assert/strict";
import test from "node:test";

function getOptionalFormString(formData, name) {
  const normalized = String(formData.get(name) ?? "").trim();
  return normalized || null;
}

function getFormCheckbox(formData, name) {
  return formData
    .getAll(name)
    .some((value) => String(value).trim() === "true");
}

test("client release policy checkboxes support hidden false plus checked true", () => {
  const formData = new FormData();
  formData.append("enabled", "false");
  formData.append("enabled", "true");
  formData.append("forceUpdate", "false");
  formData.append("allowGithubFallback", "false");
  formData.append("allowGithubFallback", "true");

  assert.equal(getFormCheckbox(formData, "enabled"), true);
  assert.equal(getFormCheckbox(formData, "forceUpdate"), false);
  assert.equal(getFormCheckbox(formData, "allowGithubFallback"), true);
});

test("client release policy form strings normalize empty values to null", () => {
  const formData = new FormData();
  formData.set("recommendedReleaseId", " ");
  formData.set("minimumSupportedVersion", " v1.2.3 ");

  assert.equal(getOptionalFormString(formData, "recommendedReleaseId"), null);
  assert.equal(
    getOptionalFormString(formData, "minimumSupportedVersion"),
    "v1.2.3",
  );
});
