import type { APIRoute } from "astro";
import { failed, forgive, lockedOut, logIn } from "../../lib/accounts";
import { remember } from "../../lib/identity";
import { log } from "../../lib/log";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (lockedOut(username)) {
    log(undefined, "refused login", { username, reason: "too-many-tries" });
    return redirect("/login?error=locked", 303);
  }
  const person = logIn(username, password);
  if (!person) {
    failed(username);
    // the same answer whether the username or the password was wrong
    log(undefined, "refused login", { username, reason: "login" });
    return redirect("/login?error=login", 303);
  }
  forgive(username);
  remember(cookies, person, url);
  log(person, "logged in");
  return redirect("/", 303);
};
