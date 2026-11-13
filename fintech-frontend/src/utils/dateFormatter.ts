const IST = "Asia/Kolkata";

// Example: 13 November 2026 5:30:12 PM  (always IST)
export const formatISTDateTime = (value?: string | Date | null): string => {
  if (!value) return "--";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "--";

  const datePart = date.toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${datePart} ${timePart}`;
};

// Example: 13 Nov 2026  (always IST)
export const formatISTDate = (value?: string | Date | null): string => {
  if (!value) return "--";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
