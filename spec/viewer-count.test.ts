import { afterEach, expect, it } from "vitest";
import { type Stream, WITHIN_MS, baseUrl, closeStreams, listen, parse, person, postInvite } from "./support";

// The viewer count (docs/decisions/0001-viewer-count.md): a card on someone's
// screen counts them as looking, and everyone else sees how many are looking,
// never who. An open page learns its stream id from the stream's "hello"
// event, reports the cards it shows to /api/viewing, and is sent "viewers"
// events: counts by invite id, leaving out the person it's sent to, with an
// invite nobody else is looking at left out (zero isn't shown).

afterEach(closeStreams);

// The id the server gave this open page, from its "hello" event.
function streamId(stream: Stream): string {
  for (const event of stream.events) {
    const [name, data] = parse(event);
    if (name === "hello") return (data as { stream: string }).stream;
  }
  throw new Error("the stream never said hello");
}

async function view(cookie: string, stream: Stream, invites: string[]): Promise<Response> {
  return fetch(new URL("/api/viewing", baseUrl), {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: new URL(baseUrl).origin },
    body: JSON.stringify({ stream: streamId(stream), invites: invites.map(Number) }),
  });
}

// What the latest "viewers" event told this page about `invite`; 0 if it
// wasn't mentioned or no counts have come yet.
function looking(stream: Stream, invite: string): number {
  const counts = stream.events.map(parse).filter(([name]) => name === "viewers");
  const last = counts.at(-1)?.[1] as Record<string, number> | undefined;
  return last?.[invite] ?? 0;
}

async function until(check: () => boolean, what: string) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > WITHIN_MS) throw new Error(`${what} didn't happen within ${WITHIN_MS} ms`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

it("shows others how many are looking at an invite, within about a second", async () => {
  const host = await person("Host");
  const invite = (await postInvite(host, "Spec check: viewer count", 4))!;
  const hosting = await listen(host);

  const ana = await person("Ana");
  const anaPage = await listen(ana);
  expect((await view(ana, anaPage, [invite])).ok).toBe(true);
  await until(() => looking(hosting, invite) === 1, "the host seeing 1 looking");

  const ben = await person("Ben");
  const benPage = await listen(ben);
  expect((await view(ben, benPage, [invite])).ok).toBe(true);
  await until(() => looking(hosting, invite) === 2, "the host seeing 2 looking");
  // others only: Ana sees Ben, not herself
  await until(() => looking(anaPage, invite) === 1, "Ana seeing 1 other looking");
});

it("counts a person once, however many of their pages show the card", async () => {
  const host = await person("Host");
  const invite = (await postInvite(host, "Spec check: viewer count, two devices", 4))!;
  const hosting = await listen(host);

  const ana = await person("Ana");
  const phone = await listen(ana);
  const laptop = await listen(ana);
  await view(ana, phone, [invite]);
  await view(ana, laptop, [invite]);
  await until(() => looking(hosting, invite) === 1, "the host seeing 1 looking");
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(looking(hosting, invite)).toBe(1);
});

it("stops counting someone once the card leaves their screen or they close the page", async () => {
  const host = await person("Host");
  const invite = (await postInvite(host, "Spec check: viewer count, leaving", 4))!;
  const hosting = await listen(host);

  const ana = await person("Ana");
  const anaPage = await listen(ana);
  await view(ana, anaPage, [invite]);
  await until(() => looking(hosting, invite) === 1, "the host seeing 1 looking");
  await view(ana, anaPage, []);
  await until(() => looking(hosting, invite) === 0, "the count dropping when Ana scrolls past");

  await view(ana, anaPage, [invite]);
  await until(() => looking(hosting, invite) === 1, "the host seeing Ana again");
  anaPage.close();
  await until(() => looking(hosting, invite) === 0, "the count dropping when Ana closes the page");
});

it("never tells anyone who is looking", async () => {
  const host = await person("Host");
  const invite = (await postInvite(host, "Spec check: viewer count, no names", 4))!;
  const hosting = await listen(host);

  const name = `Lurker${Math.random().toString(36).slice(2, 8)}`;
  const lurker = await person(name);
  const lurkerPage = await listen(lurker);
  await view(lurker, lurkerPage, [invite]);
  await until(() => looking(hosting, invite) === 1, "the host seeing 1 looking");

  // not in any event, and not on the page
  expect(hosting.events.join("\n")).not.toContain(name);
  expect(hosting.events.join("\n")).not.toContain(lurker.split("=")[1]);
  const page = await (await fetch(baseUrl, { headers: { cookie: host } })).text();
  expect(page).not.toContain(name);
});

it("only takes reports from the person whose page it is", async () => {
  const ana = await person("Ana");
  const anaPage = await listen(ana);
  const mallory = await person("Mallory");
  const res = await fetch(new URL("/api/viewing", baseUrl), {
    method: "POST",
    headers: { cookie: mallory, "content-type": "application/json", origin: new URL(baseUrl).origin },
    body: JSON.stringify({ stream: streamId(anaPage), invites: [1] }),
  });
  expect(res.ok).toBe(false);
});
