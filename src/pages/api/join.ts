import type { APIRoute } from "astro";
import { joinInvite, leaveInvite } from "../../lib/db";
import { currentPerson } from "../../lib/identity";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const inviteId = Number(form.get("invite"));
  if (!Number.isInteger(inviteId)) return redirect("/", 303);

  if (form.get("action") === "leave") {
    leaveInvite(inviteId, person.id);
    return redirect(`/#invite-${inviteId}`, 303);
  }

  const result = joinInvite(inviteId, person.id, new Date());
  if (result === "full" || result === "gone") return redirect(`/?error=${result}`, 303);
  return redirect(`/#invite-${inviteId}`, 303);
};
