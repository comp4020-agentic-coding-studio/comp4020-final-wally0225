import { afterEach, expect, it } from "vitest";
import { baseUrl, person, post, postInvite } from "./support";

// "A change by one user shows in every other open session within about a
// second, with no reload" (crit 9 spec). An open page keeps a live stream at
// /api/events, server-sent events, and the server tells it when something on
// the list changed. This checks the stream end: the page's own script swapping
// in the update is checked by hand, on two phones.

// About a second, plus a round trip to the deployed app.
const WITHIN_MS = 1500;

type Stream = { events: string[]; close: () => void };
const open: Stream[] = [];
afterEach(() => open.splice(0).forEach((s) => s.close()));

// One open session listening as `cookie`. Collects every event the server
// sends; comment lines (":", the keep-alive heartbeat) aren't events.
async function listen(cookie: string): Promise<Stream> {
  const abort = new AbortController();
  const res = await fetch(new URL("/api/events", baseUrl), { headers: { cookie }, signal: abort.signal });
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);

  const stream: Stream = { events: [], close: () => abort.abort() };
  open.push(stream);
  void (async () => {
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for await (const chunk of res.body!) {
        buffer += decoder.decode(chunk, { stream: true });
        let end;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (block.split("\n").some((line) => !line.startsWith(":"))) stream.events.push(block);
        }
      }
    } catch {
      // closed by the test
    }
  })();

  // let anything the server sends on connect arrive first, so it isn't
  // mistaken for the change under test
  await new Promise((resolve) => setTimeout(resolve, 300));
  return stream;
}

// Resolves once an event after the first `seen` names the invite `id()`
// returns, or fails after WITHIN_MS. Other checks run alongside this one and
// change the list too, so any event at all isn't enough: it has to say which
// invite changed (the page needs that anyway, to say what changed).
async function eventAbout(stream: Stream, seen: number, id: () => string | undefined): Promise<void> {
  const started = Date.now();
  const names = (event: string, invite: string) =>
    event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .some((line) => new RegExp(`\\b${invite}\\b`).test(line));
  for (;;) {
    const invite = id();
    if (invite && stream.events.slice(seen).some((event) => names(event, invite))) return;
    if (Date.now() - started > WITHIN_MS) throw new Error(`nothing about invite ${invite} arrived within ${WITHIN_MS} ms`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

it("tells other open sessions about a new invite within about a second", async () => {
  const watcher = await listen(await person("Watcher"));
  const host = await person("Host");

  // the new invite's id is only known once posting answers, but the clock
  // starts when it's sent
  let invite: string | undefined;
  const waiting = eventAbout(watcher, watcher.events.length, () => invite);
  invite = await postInvite(host, "Spec check: live new invite", 4);
  expect(invite, "posting the invite didn't land on it").toBeDefined();
  await waiting;
});

it("tells other open sessions when someone joins within about a second", async () => {
  const host = await person("Host");
  const invite = await postInvite(host, "Spec check: live join", 4);
  expect(invite, "posting the invite didn't land on it").toBeDefined();
  const watcher = await listen(host);
  const joiner = await person("Joiner");

  const waiting = eventAbout(watcher, watcher.events.length, () => invite);
  const joined = await post("/api/join", { invite: invite! }, joiner);
  expect(joined.headers.get("location")).toMatch(new RegExp(`#invite-${invite}$`));
  await waiting;

  // and a reload at that point shows what the event announced
  const page = await (await fetch(baseUrl, { headers: { cookie: host } })).text();
  expect(page).toMatch(/2 of 4 going/);
});
