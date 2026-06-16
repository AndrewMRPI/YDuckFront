export function niceDate(value?: string) {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleString();
}

export function roundedHourDate(value?: string) {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  date.setMinutes(0, 0, 0);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function gameTypeLabel(value?: string) {
  if (value === "east") {
    return "East game";
  }
  if (value === "south") {
    return "South game";
  }
  return "Game";
}
