// India has no daylight saving, so IST is always UTC + 5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 12:00 AM IST of the day that contains `date` (returned as a normal UTC Date)
const startOfISTDay = (date = new Date()) =>
  new Date(
    Math.floor((date.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS -
      IST_OFFSET_MS,
  );

const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);

/**
 * Returns { startDate, endDate } for the dashboard.
 * Always use: requestedAt >= startDate AND requestedAt < endDate
 */
const getDateRange = (filters = {}) => {
  const todayStart = startOfISTDay();
  const tomorrowStart = addDays(todayStart, 1);

  // "now" shifted by +5:30, so the getUTC... methods give IST values
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();

  switch (filters.dateRange || "today") {
    case "previousDay":
      return { startDate: addDays(todayStart, -1), endDate: todayStart };

    case "week": {
      const dow = ist.getUTCDay(); // 0 = Sunday
      const diff = dow === 0 ? 6 : dow - 1; // week starts on Monday
      return {
        startDate: addDays(todayStart, -diff),
        endDate: tomorrowStart,
      };
    }

    case "month":
      return {
        startDate: new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS),
        endDate: tomorrowStart,
      };

    case "last3months":
      return {
        startDate: new Date(Date.UTC(y, m - 3, d) - IST_OFFSET_MS),
        endDate: tomorrowStart,
      };

    case "custom": {
      const { customStartDate, customEndDate } = filters;
      if (customStartDate && customEndDate) {
        const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateOnly.test(customStartDate) || !dateOnly.test(customEndDate)) {
          throw new Error("Invalid custom date. Use YYYY-MM-DD");
        }
        const startDate = new Date(`${customStartDate}T00:00:00.000+05:30`);
        const endDay = new Date(`${customEndDate}T00:00:00.000+05:30`);
        if (isNaN(startDate.getTime()) || isNaN(endDay.getTime())) {
          throw new Error("Invalid custom date");
        }
        return { startDate, endDate: addDays(endDay, 1) };
      }
      // custom chosen but dates missing: use today (before, this crashed)
      return { startDate: todayStart, endDate: tomorrowStart };
    }

    default:
      return { startDate: todayStart, endDate: tomorrowStart };
  }
};

module.exports = { IST_OFFSET_MS, DAY_MS, startOfISTDay, addDays, getDateRange };