// Every invite happens in Canberra, but the server on Fly runs in UTC, so
// times are read and shown in Canberra's zone explicitly rather than in
// whatever zone the machine happens to be in.
export const TIME_ZONE = "Australia/Canberra";

// Minutes Canberra is ahead of UTC at a given instant (+600 or +660, DST).
function offsetMinutes(at: number): number {
  const name = new Intl.DateTimeFormat("en-AU", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

// A <input type="datetime-local"> value ("2026-10-07T17:00"), read as
// Canberra wall-clock time.
export function parseLocal(value: string): Date | undefined {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return undefined;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // the offset depends on the instant, which depends on the offset; a second
  // pass settles it either side of a daylight-saving change
  let t = asUtc - offsetMinutes(asUtc) * 60_000;
  t = asUtc - offsetMinutes(t) * 60_000;
  return new Date(t);
}

// The reverse: an instant as a datetime-local value, for the input's min.
export function toLocalInput(at: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const dayKey = (at: Date) => toLocalInput(at).slice(0, 10);
const clock = (at: Date) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(at);

// "5:30 pm"
export const formatClock = clock;

// Times are picked in five-minute steps: 5:00, 5:05, 5:10...
export const STEP_MINUTES = 5;

// Every time of day on the step, as <option>s: "17:05" shown as "5:05 pm".
export const TIME_SLOTS = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, i) => {
  const h = Math.floor((i * STEP_MINUTES) / 60);
  const m = String((i * STEP_MINUTES) % 60).padStart(2, "0");
  return { value: `${String(h).padStart(2, "0")}:${m}`, label: `${h % 12 || 12}:${m} ${h < 12 ? "am" : "pm"}` };
});

// Whether a submitted "HH:MM" is one of TIME_SLOTS.
export function onStep(value: string): boolean {
  const m = value.match(/^(\d{2}):(\d{2})$/);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60 && Number(m[2]) % STEP_MINUTES === 0;
}

// The first step at or after an instant. Canberra's UTC offset is a whole
// number of hours, so rounding the epoch lands on Canberra's steps too.
export function nextStep(at: Date): Date {
  const step = STEP_MINUTES * 60_000;
  return new Date(Math.ceil(at.getTime() / step) * step);
}

// The calendar block on a card: "TODAY" / "TMRW" / "SUN" over the day of the
// month, in Canberra.
export function dateBlock(at: Date, now: Date): { top: string; day: string } {
  const day = new Intl.DateTimeFormat("en-AU", { timeZone: TIME_ZONE, day: "numeric" }).format(at);
  if (dayKey(at) === dayKey(now)) return { top: "Today", day };
  if (dayKey(at) === dayKey(new Date(now.getTime() + 86_400_000))) return { top: "Tmrw", day };
  return { top: new Intl.DateTimeFormat("en-AU", { timeZone: TIME_ZONE, weekday: "short" }).format(at), day };
}

// The time line next to the calendar block, which already says the day:
// "Now, until 6:30 pm", "In 25 min, until 6:30 pm", or "5:00 pm – 6:30 pm".
export function formatTimes(at: Date, now: Date, until: Date | null): string {
  const minutes = Math.round((at.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return until ? `Now, until ${clock(until)}` : `Started ${clock(at)}`;
  if (minutes < 60) return `In ${minutes} min` + (until ? `, until ${clock(until)}` : "");
  return clock(at) + (until ? ` – ${clock(until)}` : "");
}
