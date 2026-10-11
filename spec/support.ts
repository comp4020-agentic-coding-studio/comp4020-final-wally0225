import { inject } from "vitest";

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

// Posts an invite as `host` and returns its id, from where posting lands.
export async function postInvite(host: string, title: string, size: number): Promise<string | undefined> {
  const res = await post("/api/invites", { title, place: "Nowhere", ...soon(5), size: String(size) }, host);
  return res.headers.get("location")?.match(/#invite-(\d+)$/)?.[1];
}
