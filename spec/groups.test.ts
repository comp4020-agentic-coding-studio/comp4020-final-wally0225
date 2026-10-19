import { expect, it } from "vitest";
import { ANU, baseUrl, person, post, soon } from "./support";

// Groups: anyone can start one and anyone can join. Only a group's owner
// and hosts post Vybes in it; a host can make a member a host, and only the
// owner can take that back. Everyone sees a group's Vybes, labelled with the
// group, but only members can join them. All of it is checked on the server.

async function startGroup(owner: string, name: string): Promise<string> {
  const res = await post("/api/groups", { action: "create", name }, owner);
  const id = res.headers.get("location")?.match(/\/groups\/(\d+)/)?.[1];
  if (!id) throw new Error(`starting ${name} didn't land on its page: ${res.headers.get("location")}`);
  return id;
}

const joinGroup = (who: string, group: string) => post("/api/groups", { action: "join", group }, who);

const postIn = (host: string, group: string, title: string) =>
  post("/api/invites", { title, place: "Nowhere", ...soon(5), size: "4", ...ANU, group, repeat: "once" }, host);

const landed = (res: Response) => res.headers.get("location")?.match(/#invite-(\d+)$/)?.[1];
const page = async (cookie: string) => (await fetch(baseUrl, { headers: { cookie } })).text();
const card = (html: string, invite: string) => html.match(new RegExp(`<li[^>]*id="invite-${invite}"[\\s\\S]*?</li>`))?.[0];

it("lets anyone start a group, and only its hosts post Vybes in it", async () => {
  const owner = await person("Owner");
  const group = await startGroup(owner, "Spec check: hosts post");
  const member = await person("Member");
  await joinGroup(member, group);
  const outsider = await person("Outsider");

  for (const who of [member, outsider]) {
    const res = await postIn(who, group, "Spec check: not a host");
    expect(res.headers.get("location")).toMatch(/error=not-group-host/);
  }
  expect(landed(await postIn(owner, group, "Spec check: by the owner"))).toBeDefined();
});

it("shows a group's Vybes to everyone, labelled, but only members can join them", async () => {
  const owner = await person("Owner");
  const name = `Spec check: members join ${Math.random().toString(36).slice(2, 7)}`;
  const group = await startGroup(owner, name);
  const invite = landed(await postIn(owner, group, "Spec check: a group Vybe"))!;
  const stranger = await person("Stranger");

  expect(card(await page(stranger), invite), "a stranger can't see it").toContain(name);

  const early = await post("/api/join", { invite }, stranger);
  expect(early.headers.get("location")).toMatch(/error=members/);

  await joinGroup(stranger, group);
  const joined = await post("/api/join", { invite }, stranger);
  expect(joined.headers.get("location")).toMatch(new RegExp(`#invite-${invite}$`));
});

it("lets a host make a member a host, and only the owner take it back", async () => {
  const owner = await person("Owner");
  const group = await startGroup(owner, "Spec check: roles");
  const [ana, ben] = await Promise.all([person("Ana"), person("Ben")]);
  const anaId = ana.split("=")[1];
  const benId = ben.split("=")[1];
  await joinGroup(ana, group);
  await joinGroup(ben, group);

  // a member can't hand out hosting
  const early = await post("/api/groups", { action: "role", group, person: anaId, role: "host" }, ben);
  expect(early.headers.get("location")).toMatch(/error=not-host/);

  await post("/api/groups", { action: "role", group, person: anaId, role: "host" }, owner);
  expect(landed(await postIn(ana, group, "Spec check: by a new host"))).toBeDefined();

  // a host can make another host, but not take hosting away
  await post("/api/groups", { action: "role", group, person: benId, role: "host" }, ana);
  const demote = await post("/api/groups", { action: "role", group, person: benId, role: "member" }, ana);
  expect(demote.headers.get("location")).toMatch(/error=not-owner/);

  await post("/api/groups", { action: "role", group, person: anaId, role: "member" }, owner);
  const after = await postIn(ana, group, "Spec check: no longer a host");
  expect(after.headers.get("location")).toMatch(/error=not-group-host/);
});

it("gives every group a cover picture, and only its owner can change it", async () => {
  const owner = await person("Owner");
  const group = await startGroup(owner, "Spec check: covers");
  const member = await person("Member");
  await joinGroup(member, group);
  const cover = async () =>
    (await (await fetch(`${baseUrl}/groups/${group}`, { headers: { cookie: member } })).text()).match(
      /\/covers\/(\w+)\.svg/,
    )?.[1];

  // a new group already has one, and the picture is really there
  const first = await cover();
  expect(first).toBeDefined();
  expect((await fetch(`${baseUrl}/covers/${first}.svg`)).ok).toBe(true);

  const pick = first === "music" ? "games" : "music";
  const update = (who: string, picked: string) =>
    post("/api/groups", { action: "update", group, name: "Spec check: covers", about: "", cover: picked }, who);

  expect((await update(member, pick)).headers.get("location")).toMatch(/error=not-owner/);
  expect(await cover()).toBe(first);

  // only the pictures Vybe ships, never an address someone typed in
  expect((await update(owner, "https://example.com/x")).headers.get("location")).toMatch(/error=cover/);

  await update(owner, pick);
  expect(await cover()).toBe(pick);
});
