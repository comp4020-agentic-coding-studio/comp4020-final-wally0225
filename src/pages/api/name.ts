import type { APIRoute } from "astro";
import { createPerson } from "../../lib/db";
import { remember } from "../../lib/identity";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 40) return redirect("/?error=name", 303);

  remember(cookies, createPerson(name), url);
  return redirect("/", 303);
};
