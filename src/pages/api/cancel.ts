import type { APIRoute } from "astro";
import { cancelInvite } from "../../lib/db";
import { currentPerson } from "../../lib/identity";

// The host calling their Vybe off. Anyone else is refused, here on the
// server, whatever the page offers them.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const inviteId = Number(form.get("invite"));
  if (!Number.isInteger(inviteId)) return redirect("/", 303);

  const result = cancelInvite(inviteId, person.id, new Date());
  if (result !== "cancelled") return redirect(`/?error=${result}`, 303);
  return redirect(`/#invite-${inviteId}`, 303);
};
