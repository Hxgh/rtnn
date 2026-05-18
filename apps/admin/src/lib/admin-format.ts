export function formatFileSize(value?: number | null) {
  if (!value) {
    return "-";
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function shortHash(value?: string | null) {
  return value ? value.slice(0, 12) : "-";
}
