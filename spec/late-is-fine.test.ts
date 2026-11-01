import { expect, it } from "vitest";
import { ANU, baseUrl, person, post, soon, usernames } from "./support";

// Late is fine, within reason: you can say you'll arrive after the start, as
// long as you get there at least an hour before it ends, in five-minute
// steps. Everyone then sees "from 5:30 pm" by your name.
//
// This checks the rule before the Vybe starts, where the server already
// offers late arrival times; the same rule applies once it's under way.

const MIN = 60_000;
const page = async (cookie: string) => (await fetch(baseUrl, { headers: { cookie } })).text();
const card = (html: string, invite: string) => html.match(new RegExp(`<li[^>]*id="invite-${invite}"[\\s\\S]*?</li>`))?.[0];

// the arrival times a person's join form offers: [milliseconds, minutes late]
function offered(html: string): [number, number][] {
  return [...html.matchAll(/<option value="(\d{10,})"[^>]*>[^<]*\((\d+) min late\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

it("offers late arrivals in five-minute steps, up to an hour before it ends", async () => {
  const host = await person("Host");
  // starts in about half an hour and runs three hours
  const res = await post("/api/invites", { title: "Spec check: late is fine", place: "Nowhere", ...soon(30, 3), size: "6", ...ANU }, host);
  const invite = res.headers.get("location")!.match(/#invite-(\d+)$/)![1];

  const stranger = await person("Stranger");
  const times = offered(card(await page(stranger), invite)!);

  expect(times.length, "no late arrivals offered").toBeGreaterThan(0);
  for (const [, late] of times) expect(late % 5, `${late} min late isn't on a five-minute step`).toBe(0);
  expect(times[0][1], "the first late time").toBe(5);
  // three hours long, so the last arrival is two hours after the start
  expect(times.at(-1)![1], "the last late time").toBe(120);
});

it("takes an arrival up to the cutoff and refuses one after it, or off the step", async () => {
  const host = await person("Host");
  const res = await post("/api/invites", { title: "Spec check: cutoff", place: "Nowhere", ...soon(30, 3), size: "6", ...ANU }, host);
  const invite = res.headers.get("location")!.match(/#invite-(\d+)$/)![1];

  const stranger = await person("Stranger");
  const times = offered(card(await page(stranger), invite)!);
  const last = times.at(-1)![0];
  const start = last - 120 * MIN;

  const refused: [string, number][] = [
    ["five minutes past the cutoff", last + 5 * MIN],
    ["half an hour before the end", last + 30 * MIN],
    ["off the five-minute step", start + 7 * MIN],
    ["before it starts", start - 5 * MIN],
    ["a day later", last + 24 * 60 * MIN],
  ];
  for (const [what, at] of refused) {
    const joined = await post("/api/join", { invite, arrival: String(at) }, stranger);
    expect(joined.headers.get("location"), what).toMatch(/error=arrival/);
  }
  expect((await post("/api/join", { invite, arrival: "later" }, stranger)).headers.get("location")).toMatch(/error=arrival/);
  expect(card(await page(host), invite), "a refused arrival still put them on the list").not.toContain(usernames.get(stranger)!);

  const ok = await post("/api/join", { invite, arrival: String(last) }, stranger);
  expect(ok.headers.get("location"), "the last allowed time was refused").toMatch(new RegExp(`#invite-${invite}$`));
});

it("shows everyone when a late joiner will arrive, and on-time people stay plain", async () => {
  const host = await person("Host");
  const res = await post("/api/invites", { title: "Spec check: from time", place: "Nowhere", ...soon(30, 3), size: "6", ...ANU }, host);
  const invite = res.headers.get("location")!.match(/#invite-(\d+)$/)![1];

  const late = await person("Late");
  const early = await person("Early");
  const [firstLate] = offered(card(await page(late), invite)!);
  await post("/api/join", { invite, arrival: String(firstLate[0]) }, late);
  await post("/api/join", { invite, arrival: "start" }, early);

  const names = card(await page(host), invite)!.match(/<p class="invite__names"[^>]*>[\s\S]*?<\/p>/)![0];
  expect(names).toMatch(new RegExp(`${usernames.get(late)} \\(from \\d{1,2}:\\d{2} [ap]m\\)`));
  expect(names).toContain(usernames.get(early)!);
  expect(names, "an on-time person was marked late").not.toMatch(new RegExp(`${usernames.get(early)} \\(from`));
});
