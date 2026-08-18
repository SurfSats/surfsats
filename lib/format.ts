const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(isoDate: string) {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00`));
}
