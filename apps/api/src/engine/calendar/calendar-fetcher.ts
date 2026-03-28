import axios from "axios";
import { db } from "../../db/client.js";
import { calendarEvents } from "../../db/schema/index.js";

type FFEvent = {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast: string;
  previous: string;
};

// ForexFactory public calendar JSON (no API key required)
const FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

const IMPACT_MAP: Record<string, string> = {
  "High":   "high",
  "Medium": "medium",
  "Low":    "low",
  "Holiday":"low",
};

export async function fetchAndStoreCalendar() {
  const { data } = await axios.get<FFEvent[]>(FF_URL, { timeout: 10_000 });

  if (!Array.isArray(data) || data.length === 0) return 0;

  const rows = data
    .filter((e) => e.date && e.time && e.country)
    .map((e) => {
      // Parse date + time into UTC timestamp
      const dateStr = `${e.date} ${e.time === "All Day" ? "00:00:00" : e.time}`;
      const eventTime = new Date(dateStr);

      return {
        event_time: isNaN(eventTime.getTime()) ? new Date() : eventTime,
        currency: e.country.toUpperCase().slice(0, 4),
        impact: IMPACT_MAP[e.impact] ?? "low",
        title: e.title,
        forecast: e.forecast || null,
        previous: e.previous || null,
        fetched_at: new Date(),
      };
    });

  if (rows.length === 0) return 0;

  await db
    .insert(calendarEvents)
    .values(rows)
    .onConflictDoNothing();

  return rows.length;
}
