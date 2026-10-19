import type { APIRoute } from "astro";
import {
  MAX_GROUP_ABOUT,
  MAX_GROUP_NAME,
  createGroup,
  isCover,
  joinGroup,
  leaveGroup,
  removeMember,
  setRole,
  updateGroup,
} from "../../lib/groups";
import { currentPerson } from "../../lib/identity";
import { log } from "../../lib/log";

// Everything done to a group, by form: create, join, leave, role, remove,
// update. Each asks src/lib/groups.ts, which holds the rules, and each is
// logged with who did it.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const person = currentPerson(cookies);
  if (!person) return redirect("/", 303);

  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const group = Number(form.get("group"));
  const back = (error?: string) =>
    redirect(Number.isInteger(group) && group > 0 ? `/groups/${group}${error ? `?error=${error}` : ""}` : `/groups${error ? `?error=${error}` : ""}`, 303);

  if (action === "create") {
    const name = String(form.get("name") ?? "").trim();
    const about = String(form.get("about") ?? "").trim();
    if (!name || name.length > MAX_GROUP_NAME || about.length > MAX_GROUP_ABOUT) return redirect("/groups?error=name", 303);
    const created = createGroup(person.id, name, about);
    log(person, "created group", { group: created.id, name });
    return redirect(`/groups/${created.id}`, 303);
  }

  if (!Number.isInteger(group) || group <= 0) return redirect("/groups", 303);

  if (action === "join") {
    const result = joinGroup(group, person.id);
    log(person, "joined group", { group, result });
    // straight back to the Vybe they were trying to join, if that's why
    const then = String(form.get("then") ?? "");
    if (result !== "gone" && /^\/#invite-\d+$/.test(then)) return redirect(then, 303);
    return back(result === "gone" ? "gone" : undefined);
  }

  if (action === "leave") {
    const result = leaveGroup(group, person.id);
    log(person, "left group", { group, result });
    return back(result === "left" ? undefined : result);
  }

  const target = String(form.get("person") ?? "");

  if (action === "role") {
    const role = form.get("role") === "host" ? "host" : "member";
    const result = setRole(group, person.id, target, role);
    log(person, role === "host" ? "make host" : "remove host", { group, person: target.slice(0, 8), result });
    return back(result === "changed" ? undefined : result);
  }

  if (action === "remove") {
    const result = removeMember(group, person.id, target);
    log(person, "remove member", { group, person: target.slice(0, 8), result });
    return back(result === "removed" ? undefined : result);
  }

  if (action === "update") {
    const name = String(form.get("name") ?? "").trim();
    const about = String(form.get("about") ?? "").trim();
    if (!name || name.length > MAX_GROUP_NAME || about.length > MAX_GROUP_ABOUT) return back("name");
    const picked = String(form.get("cover") ?? "");
    const cover = isCover(picked) ? picked : null;
    if (picked && !cover) return back("cover");
    const result = updateGroup(group, person.id, name, about, cover);
    log(person, "updated group", { group, cover: cover ?? "-", result });
    return back(result === "updated" ? undefined : result);
  }

  return back();
};
