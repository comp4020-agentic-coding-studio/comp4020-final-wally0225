import { expect, inject, it } from "vitest";

// "Full means full": when an invite has one spot left and several people try
// to take it at once, exactly one gets it and the rest are told it filled up.
// A group chat can't promise this; the headcount on an invite is only worth
// trusting if it holds. Like every check in spec/, this runs against the
// RUNNING app over HTTP.
const baseUrl = inject("baseUrl");

// Astro refuses form POSTs from other origins, so each request says it comes
// from the app itself.
const headers = { origin: new URL(baseUrl).origin };

async function post(path: string, fields: Record<string, string>, cookie?: string): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });
}

// A new person, as the app knows them: the cookie it sets once they give a name.
async function person(name: string): Promise<string> {
  const res = await post("/api/name", { name });
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`no cookie for ${name}`);
  return cookie;
}

// The form's date and five-minute start and end fields for an invite starting
// a few minutes from now and running an hour, in Canberra time, which is how
// the app reads them.
function soon(minutes: number): { date: string; startTime: string; endTime: string } {
  const step = 5 * 60_000;
  const start = Math.ceil((Date.now() + minutes * 60_000) / step) * step;
  const local = (at: number) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Australia/Canberra",
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
  const s = local(start);
  const e = local(start + 60 * 60_000);
  return { date: `${s.year}-${s.month}-${s.day}`, startTime: `${s.hour}:${s.minute}`, endTime: `${e.hour}:${e.minute}` };
}

it("never lets more people join than the invite has room for", async () => {
  const host = await person("Host");
  const res = await post(
    "/api/invites",
    { title: "Spec check: full means full", place: "Nowhere", ...soon(5), size: "3" },
    host,
  );
  const invite = res.headers.get("location")?.match(/#invite-(\d+)$/)?.[1];
  expect(invite, "posting the invite didn't land on it").toBeDefined();

  // two spots left after the host; six people go for them at the same moment
  const racers = await Promise.all(Array.from({ length: 6 }, (_, i) => person(`Racer ${i + 1}`)));
  const outcomes = await Promise.all(
    racers.map(async (cookie) => {
      const joined = await post("/api/join", { invite: invite! }, cookie);
      return joined.headers.get("location") ?? "";
    }),
  );

  expect(outcomes.filter((to) => to.endsWith(`#invite-${invite}`))).toHaveLength(2);
  expect(outcomes.filter((to) => to.includes("error=full"))).toHaveLength(4);

  // and the page agrees with what each of them was told
  const page = await (await fetch(baseUrl, { headers: { cookie: host } })).text();
  expect(page).toMatch(/3 of 3 going/);
});
