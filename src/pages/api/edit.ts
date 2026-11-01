import type { APIRoute } from "astro";
import { editInvite } from "../../lib/db";
import { currentPerson } from "../../lib/identity";
import { readDetails } from "../../lib/invite-details";
import { log } from "../../lib/log";

// The host changing their Vybe before it starts. Anyone else is refused, here
// on the server, whatever the page offers them.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const inviteId = Number(form.get("invite"));
  if (!Number.isInteger(inviteId)) return redirect("/", 303);

  const details = readDetails(form);
  if ("error" in details) return redirect(`/edit/${inviteId}?error=${details.error}`, 303);

  const result = editInvite(inviteId, person.id, new Date(), details);
  log(person, "edit", { invite: inviteId, result });
  if (result === "not-host" || result === "gone") return redirect(`/?error=${result === "gone" ? "gone" : "not-host"}`, 303);
  if (result !== "edited") return redirect(`/edit/${inviteId}?error=${result}`, 303);
  return redirect(`/#invite-${inviteId}`, 303);
};
