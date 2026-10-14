import { expect, it } from "vitest";
import { baseUrl, person, post, postInvite } from "./support";

// The host can call a Vybe off; nobody else can. Once it's off, the people
// who joined still see it, marked cancelled, so nobody turns up anyway; it
// leaves everyone else's list, and nobody new can join it.

const page = async (cookie: string) => (await fetch(baseUrl, { headers: { cookie } })).text();
const card = (html: string, invite: string) => html.match(new RegExp(`<li[^>]*id="invite-${invite}"[\\s\\S]*?</li>`))?.[0];

it("lets nobody but the host cancel a Vybe", async () => {
  const host = await person("Host");
  const invite = (await postInvite(host, "Spec check: only the host cancels", 4))!;
  const joiner = await person("Joiner");
  await post("/api/join", { invite }, joiner);
  const stranger = await person("Stranger");

  for (const who of [joiner, stranger]) {
    const res = await post("/api/cancel", { invite }, who);
    expect(res.headers.get("location")).toMatch(/error=not-host/);
  }
  expect(card(await page(stranger), invite), "a refused cancel left it open").toBeDefined();
  expect(card(await page(stranger), invite)).not.toMatch(/Cancelled/);
});

it("keeps a cancelled Vybe in view for those who joined, and takes it off everyone else's list", async () => {
  const host = await person("Host");
  const invite = (await postInvite(host, "Spec check: cancelled", 4))!;
  const joiner = await person("Joiner");
  await post("/api/join", { invite }, joiner);
  const stranger = await person("Stranger");

  const res = await post("/api/cancel", { invite }, host);
  expect(res.headers.get("location")).toMatch(new RegExp(`#invite-${invite}$`));

  for (const who of [host, joiner]) expect(card(await page(who), invite)).toMatch(/Cancelled/);
  expect(card(await page(stranger), invite), "a stranger still sees it").toBeUndefined();

  const late = await post("/api/join", { invite }, stranger);
  expect(late.headers.get("location")).toMatch(/error=gone/);
});
