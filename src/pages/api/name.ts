import type { APIRoute } from "astro";
import { createPerson } from "../../lib/db";
import { remember } from "../../lib/identity";
import { log } from "../../lib/log";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 40) return redirect("/?error=name", 303);

  const person = createPerson(name);
  remember(cookies, person, url);
  log(person, "arrived");
  return redirect("/", 303);
};
