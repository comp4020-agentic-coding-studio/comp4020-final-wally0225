import type { AstroCookies } from "astro";
import { type Person } from "./db";
import { endSession, personForSession, startSession } from "./accounts";

// Who's asking: the session cookie set when someone signs up or logs in. It
// holds a random token, not their id or their password; the server looks it
// up (src/lib/accounts.ts), and logging out deletes it there.
const COOKIE = "session";

export function currentPerson(cookies: AstroCookies): Person | undefined {
  return personForSession(cookies.get(COOKIE)?.value);
}

export function remember(cookies: AstroCookies, person: Person, url: URL) {
  cookies.set(COOKIE, startSession(person.id), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function forget(cookies: AstroCookies) {
  endSession(cookies.get(COOKIE)?.value);
  cookies.delete(COOKIE, { path: "/" });
}
