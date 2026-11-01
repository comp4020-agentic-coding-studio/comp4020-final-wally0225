import { expect, it } from "vitest";
import { ANU, baseUrl, person, post, soon } from "./support";

// The host can change any detail of their Vybe until it starts; nobody else
// can, and the people who joined never end up in a Vybe with less room than
// they need.

const page = async (cookie: string) => (await fetch(baseUrl, { headers: { cookie } })).text();
const card = (html: string, invite: string) => html.match(new RegExp(`<li[^>]*id="invite-${invite}"[\\s\\S]*?</li>`))?.[0];

async function posted(host: string, title: string, size = 4): Promise<string> {
  const res = await post("/api/invites", { title, place: "Old place", ...soon(30), size: String(size), ...ANU }, host);
  return res.headers.get("location")!.match(/#invite-(\d+)$/)![1];
}

// what the edit form sends: every detail, as posting does
const edited = (invite: string, changes: Record<string, string> = {}) => ({
  invite,
  title: "Spec check: new title",
  place: "New place",
  ...soon(90),
  size: "6",
  ...ANU,
  tag: "sport",
  ...changes,
});

it("lets the host change what, where, when, how many and the kind of Vybe", async () => {
  const host = await person("Host");
  const invite = await posted(host, "Spec check: before edit");
  const joiner = await person("Joiner");
  await post("/api/join", { invite }, joiner);

  const res = await post("/api/edit", edited(invite), host);
  expect(res.headers.get("location")).toMatch(new RegExp(`#invite-${invite}$`));

  for (const who of [host, joiner]) {
    const html = card(await page(who), invite)!;
    expect(html).toContain("Spec check: new title");
    expect(html).toContain("New place");
    expect(html).toMatch(/Sport/);
    expect(html).not.toContain("Spec check: before edit");
  }
});

it("lets nobody but the host change a Vybe", async () => {
  const host = await person("Host");
  const invite = await posted(host, "Spec check: only the host edits");
  const joiner = await person("Joiner");
  await post("/api/join", { invite }, joiner);

  for (const who of [joiner, await person("Stranger")]) {
    const res = await post("/api/edit", edited(invite), who);
    expect(res.headers.get("location")).toMatch(/error=not-host/);
  }
  const html = card(await page(host), invite)!;
  expect(html, "a refused edit changed it").toContain("Spec check: only the host edits");
});

it("won't shrink a Vybe below the people already in it", async () => {
  const host = await person("Host");
  const invite = await posted(host, "Spec check: no shrinking", 4);
  for (const name of ["A", "B"]) await post("/api/join", { invite }, await person(name));

  // host + two joiners = three going
  const res = await post("/api/edit", edited(invite, { size: "2" }), host);
  expect(res.headers.get("location")).toMatch(/error=size/);
  expect((await post("/api/edit", edited(invite, { size: "3" }), host)).headers.get("location")).toMatch(/#invite-/);
});

it("keeps the same rules as posting: what, where and a start that hasn't passed", async () => {
  const host = await person("Host");
  const invite = await posted(host, "Spec check: edit rules");
  const past = { date: "2020-01-01", startTime: "09:00", endTime: "10:00" };

  const cases: [Record<string, string>, string][] = [
    [{ title: "" }, "details"],
    [{ place: "" }, "details"],
    [past, "time"],
    [{ lat: "0", lng: "0" }, "spot"],
  ];
  for (const [changes, error] of cases) {
    const res = await post("/api/edit", edited(invite, changes), host);
    expect(res.headers.get("location"), JSON.stringify(changes)).toMatch(new RegExp(`error=${error}`));
  }
});
