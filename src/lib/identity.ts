import type { AstroCookies } from "astro";
import { type Person, getPerson } from "./db";

// Who's asking: a random id in a cookie, set when someone first gives their
// name. Losing the cookie means starting again under a new id.
const COOKIE = "person";

export function currentPerson(cookies: AstroCookies): Person | undefined {
  return getPerson(cookies.get(COOKIE)?.value);
}

export function remember(cookies: AstroCookies, person: Person, url: URL) {
  cookies.set(COOKIE, person.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 365,
  });
}
