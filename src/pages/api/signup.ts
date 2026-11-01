import type { APIRoute } from "astro";
import { passwordProblem, signUp, validUsername } from "../../lib/accounts";
import { remember } from "../../lib/identity";
import { log } from "../../lib/log";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!validUsername(username)) return redirect("/signup?error=username", 303);
  if (passwordProblem(password)) return redirect("/signup?error=password", 303);

  const person = signUp(username, password);
  if (person === "taken") {
    log(undefined, "refused sign-up", { username, reason: "taken" });
    return redirect("/signup?error=taken", 303);
  }
  remember(cookies, person, url);
  log(person, "signed up");
  return redirect("/", 303);
};
