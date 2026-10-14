import { expect, it } from "vitest";
import { baseUrl, person, post, postInvite } from "./support";

// "Add to my calendar": /api/calendar.ics gives the Vybes you've joined as
// a calendar file your phone can import, or one of them with ?invite=. Only
// your own: someone who hasn't joined a Vybe can't export it.

const ics = (cookie: string, invite?: string) =>
  fetch(new URL(`/api/calendar.ics${invite ? `?invite=${invite}` : ""}`, baseUrl), { headers: { cookie } });

it("exports the Vybes you've joined as a calendar file, and nobody else's", async () => {
  const host = await person("Host");
  const invite = (await postInvite(host, "Spec check: calendar", 4))!;
  const joiner = await person("Joiner");
  await post("/api/join", { invite }, joiner);
  const stranger = await person("Stranger");

  const mine = await ics(joiner, invite);
  expect(mine.status).toBe(200);
  expect(mine.headers.get("content-type")).toMatch(/^text\/calendar/);
  const body = await mine.text();
  expect(body).toMatch(/^BEGIN:VCALENDAR/);
  expect(body).toMatch(/BEGIN:VEVENT[\s\S]*SUMMARY:Spec check: calendar[\s\S]*END:VEVENT/);

  expect((await ics(stranger, invite)).status).toBe(404);
  expect(await (await ics(stranger)).text()).not.toContain("Spec check: calendar");
});
