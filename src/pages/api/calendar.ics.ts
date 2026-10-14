import type { APIRoute } from "astro";
import { listUpcoming } from "../../lib/db";
import { currentPerson } from "../../lib/identity";
import { log } from "../../lib/log";

// "Add to my calendar": the Vybes you've joined (or one of them, with
// ?invite=) as an iCalendar file your phone opens in its calendar app. Only
// your own; a Vybe you haven't joined isn't yours to export.

// iCalendar text: commas, semicolons, backslashes and newlines escaped
const text = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
// 20261015T070000Z
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const GET: APIRoute = ({ cookies, url }) => {
  const person = currentPerson(cookies);
  if (!person) return new Response(null, { status: 401 });

  const only = url.searchParams.get("invite");
  const mine = listUpcoming(new Date(), person.id).filter(
    (i) => i.going.some((g) => g.id === person.id) && !i.cancelledAt && (!only || String(i.id) === only),
  );
  if (only && mine.length === 0) return new Response("Not one of your Vybes", { status: 404 });

  const now = stamp(new Date());
  const events = mine.map((i) =>
    [
      "BEGIN:VEVENT",
      `UID:vybe-${i.id}@${url.host}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(i.startsAt)}`,
      `DTEND:${stamp(i.endsAt ?? new Date(i.startsAt.getTime() + 3_600_000))}`,
      `SUMMARY:${text(i.title)}`,
      `LOCATION:${text(i.place)}`,
      i.lat !== null && i.lng !== null ? `GEO:${i.lat};${i.lng}` : "",
      `DESCRIPTION:${text(`${i.going.length} of ${i.size} going. Posted by ${i.host}${i.group ? ` in ${i.group}` : ""}.`)}`,
      `URL:${url.origin}/#invite-${i.id}`,
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n"),
  );

  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vybe//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Vybe", ...events, "END:VCALENDAR", ""].join("\r\n");
  log(person, "exported calendar", { invites: mine.length });

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${only ? `vybe-${only}` : "my-vybes"}.ics"`,
      "cache-control": "no-store",
    },
  });
};
