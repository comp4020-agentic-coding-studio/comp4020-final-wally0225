import { expect, inject } from "vitest";

// What the checks in spec/ share: talking to the RUNNING app as one or more
// people. Not a test itself, so vitest doesn't run it.
export const baseUrl = inject("baseUrl");

// Astro refuses form POSTs from other origins, so each request says it comes
// from the app itself.
const headers = { origin: new URL(baseUrl).origin };

export async function post(path: string, fields: Record<string, string>, cookie?: string): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });
}

// A new person, as the app knows them: the cookie it sets once they give a name.
export async function person(name: string): Promise<string> {
  const res = await post("/api/name", { name });
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`no cookie for ${name}`);
  return cookie;
}

// The form's date and five-minute start and end fields for an invite starting
// a few minutes from now and running an hour, in Canberra time, which is how
// the app reads them.
export function soon(minutes: number): { date: string; startTime: string; endTime: string } {
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

// A spot on ANU's Acton campus, as the post form's map sends it.
export const ANU = { lat: "-35.2777", lng: "149.1185" };

// Posts an invite as `host` and returns its id, from where posting lands.
export async function postInvite(host: string, title: string, size: number): Promise<string | undefined> {
  const res = await post("/api/invites", { title, place: "Nowhere", ...soon(5), size: String(size), ...ANU }, host);
  return res.headers.get("location")?.match(/#invite-(\d+)$/)?.[1];
}

// How soon a change has to reach other open pages: about a second, plus a
// round trip to the deployed app.
export const WITHIN_MS = 1500;

// An open page's live stream (/api/events): every event the server has sent
// it so far, as raw blocks. Comment lines (":", the keep-alive heartbeat)
// aren't events.
export type Stream = { events: string[]; close: () => void };
const open: Stream[] = [];

// For afterEach: closes every stream a test opened.
export function closeStreams() {
  open.splice(0).forEach((s) => s.close());
}

// One open session listening as `cookie`.
export async function listen(cookie: string): Promise<Stream> {
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

// An event's name and its data, parsed as JSON: "event: change" with
// "data: {...}" gives ["change", {...}].
export function parse(event: string): [string, unknown] {
  const lines = event.split("\n");
  const name = lines.find((l) => l.startsWith("event:"))?.slice(6).trim() ?? "message";
  const data = lines
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim())
    .join("\n");
  try {
    return [name, JSON.parse(data)];
  } catch {
    return [name, data];
  }
}
