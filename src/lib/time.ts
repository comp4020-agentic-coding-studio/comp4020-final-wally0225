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

// "Today 5:00 pm", "Tomorrow 9:30 am", "Yesterday 6:00 pm", "Fri 9 Oct, 5:00 pm"
function formatDay(at: Date, now: Date): string {
  const shifted = (days: number) => dayKey(new Date(now.getTime() + days * 86_400_000));
  if (dayKey(at) === dayKey(now)) return `Today ${clock(at)}`;
  if (dayKey(at) === shifted(1)) return `Tomorrow ${clock(at)}`;
  if (dayKey(at) === shifted(-1)) return `Yesterday ${clock(at)}`;
  const day = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(at);
  return `${day}, ${clock(at)}`;
}

// An upcoming start: "in 25 min", or the day and time once it's an hour off.
export function formatWhen(at: Date, now: Date): string {
  const minutes = Math.round((at.getTime() - now.getTime()) / 60_000);
  if (minutes < 60) return `in ${Math.max(minutes, 1)} min`;
  return formatDay(at, now);
}

// A start that has passed, for past plans.
export function formatPast(at: Date, now: Date): string {
  return formatDay(at, now);
}
