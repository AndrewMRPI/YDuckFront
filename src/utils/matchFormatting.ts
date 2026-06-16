export function niceDate(value?: string) {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleString();
}

export function durationLabel(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes > 0 ? `${minutes} min` : `${seconds} sec`;
}
