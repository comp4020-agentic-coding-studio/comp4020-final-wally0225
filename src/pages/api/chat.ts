import type { APIRoute } from "astro";
import { MAX_MESSAGE, sendMessage } from "../../lib/chat";
import { currentPerson } from "../../lib/identity";
import { log } from "../../lib/log";

// Saying something in a Vybe's chat, by form. src/lib/chat.ts decides whether
// this person can; the log says who wrote in which chat, never what.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const inviteId = Number(form.get("invite"));
  if (!Number.isInteger(inviteId) || inviteId <= 0) return redirect("/", 303);
  const back = (error?: string) => redirect(`/chat/${inviteId}${error ? `?error=${error}` : "#latest"}`, 303);

  const body = String(form.get("body") ?? "").trim();
  if (!body || body.length > MAX_MESSAGE) return back("message");

  const result = sendMessage(inviteId, person.id, body, new Date());
  log(person, "chat", { invite: inviteId, result, chars: body.length });
  return back(result === "sent" ? undefined : result);
};
