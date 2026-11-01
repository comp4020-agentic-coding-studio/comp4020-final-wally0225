import type { APIRoute } from "astro";
import { createInvite } from "../../lib/db";
import { canHost, roleIn } from "../../lib/groups";
import { currentPerson } from "../../lib/identity";
import { log } from "../../lib/log";
import { readDetails } from "../../lib/invite-details";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const details = readDetails(form);
  if ("error" in details) return redirect(`/?error=${details.error}`, 303);
  const { title, place, startsAt, endsAt, size, lat, lng, tag } = details;

  // in a group: only its owner and hosts post there, and only there can a
  // Vybe repeat weekly
  const groupField = String(form.get("group") ?? "");
  const groupId = groupField ? Number(groupField) : null;
  if (groupId !== null && (!Number.isInteger(groupId) || !canHost(roleIn(groupId, person.id)))) {
    log(person, "refused post", { group: groupField, reason: "not-group-host" });
    return redirect("/?error=not-group-host", 303);
  }
  const repeat = groupId !== null && form.get("repeat") === "weekly" ? "weekly" : "once";

  const invite = createInvite({ hostId: person.id, title, place, startsAt, endsAt, size, lat, lng, groupId, repeat, tag });
  log(person, "posted", { invite: invite.id, title, group: groupId, repeat, tag });
  return redirect(`/#invite-${invite.id}`, 303);
};
