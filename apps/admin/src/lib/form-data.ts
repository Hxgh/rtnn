export function getOptionalFormString(formData: FormData, name: string) {
  const normalized = String(formData.get(name) ?? "").trim();
  return normalized || null;
}

export function getFormCheckbox(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .some((value) => String(value).trim() === "true");
}
