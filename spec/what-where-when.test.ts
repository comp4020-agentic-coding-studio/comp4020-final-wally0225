import { expect, it } from "vitest";
import { ANU, baseUrl, person, post, soon } from "./support";

// Every Vybe says what, where and when. A post missing any of them is the
// group-chat message everyone forgets, so the server refuses it and nothing
// reaches the list.

const page = async (cookie: string) => (await fetch(baseUrl, { headers: { cookie } })).text();
const card = (html: string, invite: string) => html.match(new RegExp(`<li[^>]*id="invite-${invite}"[\\s\\S]*?</li>`))?.[0];

const complete = (title: string) => ({ title, place: "Spec check court", ...soon(30), size: "4", ...ANU });
const without = (title: string, field: string) => ({ ...complete(title), [field]: "" });

it("shows what, where and when on every Vybe that gets posted", async () => {
  const host = await person("Host");
  const res = await post("/api/invites", complete("Spec check: has all three"), host);
  const invite = res.headers.get("location")?.match(/#invite-(\d+)$/)?.[1];
  expect(invite, "a complete post was refused").toBeDefined();

  const html = card(await page(host), invite!)!;
  expect(html, "what").toContain("Spec check: has all three");
  expect(html, "where").toContain("Spec check court");
  expect(html, "when").toMatch(/\d{1,2}:\d{2}\s?[ap]m|In \d+ min|Now/i);
});

it("refuses a post that leaves out what, where or when, and puts nothing on the list", async () => {
  const host = await person("Host");
  const watcher = await person("Watcher");

  const missing: [string, Record<string, string>][] = [
    ["no what", without("", "title")],
    ["a what of only spaces", { ...complete("x"), title: "   " }],
    ["no where", without("Spec check: no where", "place")],
    ["a where of only spaces", { ...complete("Spec check: blank where"), place: "   " }],
    ["no date", without("Spec check: no date", "date")],
    ["no start time", without("Spec check: no start", "startTime")],
    ["no end time", without("Spec check: no end", "endTime")],
  ];

  for (const [what, fields] of missing) {
    const res = await post("/api/invites", fields, host);
    const to = res.headers.get("location") ?? "";
    expect(to, `${what} was accepted`).toMatch(/error=(details|time|end)/);
    expect(to, `${what} landed on a card`).not.toMatch(/#invite-/);
  }

  const html = await page(watcher);
  for (const title of ["Spec check: no where", "Spec check: blank where", "Spec check: no date", "Spec check: no start", "Spec check: no end"]) {
    expect(html, `"${title}" reached the list`).not.toContain(title);
  }
});

it("refuses a what or where too long to read on a card", async () => {
  const host = await person("Host");
  for (const field of ["title", "place"]) {
    const res = await post("/api/invites", { ...complete("Spec check: too long"), [field]: "x".repeat(81) }, host);
    expect(res.headers.get("location"), `${field} of 81 characters`).toMatch(/error=details/);
  }
});
