import type { APIRoute } from "astro";
import { MAX_HOURS, MAX_SIZE, createInvite } from "../../lib/db";
import { currentPerson } from "../../lib/identity";
import { onStep, parseLocal } from "../../lib/time";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const place = String(form.get("place") ?? "").trim();
  const date = String(form.get("date") ?? "");
  const startTime = String(form.get("startTime") ?? "");
  const endTime = String(form.get("endTime") ?? "");
  const size = Number(form.get("size"));

  // what, where and when are all required: a plan missing one of them is the
  // group-chat message everyone forgets
  if (!title || title.length > 80 || !place || place.length > 80) return redirect("/?error=details", 303);

  // times come from the five-minute dropdowns; anything else is refused
  const startsAt = onStep(startTime) ? parseLocal(`${date}T${startTime}`) : undefined;
  if (!startsAt || startsAt <= new Date()) return redirect("/?error=time", 303);

  let endsAt = onStep(endTime) ? parseLocal(`${date}T${endTime}`) : undefined;
  if (endsAt && endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86_400_000);
  if (!endsAt || endsAt.getTime() - startsAt.getTime() > MAX_HOURS * 3_600_000) {
    return redirect("/?error=end", 303);
  }

  if (!Number.isInteger(size) || size < 2 || size > MAX_SIZE) return redirect("/?error=size", 303);

  const invite = createInvite({ hostId: person.id, title, place, startsAt, endsAt, size });
  return redirect(`/#invite-${invite.id}`, 303);
};
