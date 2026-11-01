import type { APIRoute } from "astro";
import { currentPerson, forget } from "../../lib/identity";
import { log } from "../../lib/log";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const person = currentPerson(cookies);
  forget(cookies);
  log(person, "logged out");
  return redirect("/", 303);
};
