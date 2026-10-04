import type { APIRoute } from "astro";
import { MAX_SIZE, createInvite } from "../../lib/db";
import { currentPerson } from "../../lib/identity";
import { parseLocal } from "../../lib/time";



export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const place = String(form.get("place") ?? "").trim();
  const startsAt = parseLocal(String(form.get("startsAt") ?? ""));
  const size = Number(form.get("size"));

  // what, where and when are all required: a plan missing one of them is the
  // group-chat message everyone forgets
  if (!title || title.length > 80 || !place || place.length > 80) return redirect("/?error=details", 303);
  if (!startsAt || startsAt <= new Date()) return redirect("/?error=time", 303);
  if (!Number.isInteger(size) || size < 2 || size > MAX_SIZE) return redirect("/?error=size", 303);

  const invite = createInvite({ hostId: person.id, title, place, startsAt, size });
  return redirect(`/#invite-${invite.id}`, 303);
};
