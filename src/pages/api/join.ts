import type { APIRoute } from "astro";
import { joinInvite, leaveInvite, stopRepeat } from "../../lib/db";
import { currentPerson } from "../../lib/identity";
import { log } from "../../lib/log";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const inviteId = Number(form.get("invite"));
  if (!Number.isInteger(inviteId)) return redirect("/", 303);

  if (form.get("action") === "leave") {
    leaveInvite(inviteId, person.id);
    log(person, "left", { invite: inviteId });
    return redirect(`/#invite-${inviteId}`, 303);
  }

  if (form.get("action") === "stop-repeat") {
    const result = stopRepeat(inviteId, person.id);
    log(person, "stopped repeat", { invite: inviteId, result });
    return redirect(result === "stopped" ? `/#invite-${inviteId}` : `/?error=${result}`, 303);
  }

  // "start" (or nothing) means on time; otherwise the arrival time the join
  // form offered, as milliseconds
  const arrival = String(form.get("arrival") ?? "start");
  const arrivesAt = arrival === "start" ? null : new Date(Number(arrival));
  if (arrivesAt && Number.isNaN(arrivesAt.getTime())) return redirect("/?error=arrival", 303);

  const result = joinInvite(inviteId, person.id, new Date(), arrivesAt);
  log(person, "join", { invite: inviteId, result, arrival: arrivesAt ? arrivesAt.toISOString() : "on time" });
  if (result === "full" || result === "gone" || result === "arrival") return redirect(`/?error=${result}`, 303);
  if (result === "members") return redirect(`/?error=members&invite=${inviteId}`, 303);
  return redirect(`/#invite-${inviteId}`, 303);
};
