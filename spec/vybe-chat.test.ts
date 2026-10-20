import { afterEach, expect, it } from "vitest";
import { WITHIN_MS, baseUrl, closeStreams, listen, parse, person, post, postInvite } from "./support";

// Each Vybe has a chat for the people going: to say hello before meeting, or
// "running five minutes late". Only people going can read it or write in it,
// checked on the server every time, not just when the page opens. Someone
// who leaves loses it straight away; what they wrote stays. A cancelled Vybe
// keeps its chat until it would have ended, so people can sort out what's
// next. When a Vybe ends its messages are deleted (checked outside spec/:
// these checks can't wait for a Vybe to end).

afterEach(closeStreams);

const chat = (cookie: string, invite: string) => fetch(`${baseUrl}/chat/${invite}`, { headers: { cookie }, redirect: "manual" });
const say = (cookie: string, invite: string, body: string) => post("/api/chat", { invite, body }, cookie);
const refused = (res: Response) => res.headers.get("location")?.match(/error=([\w-]+)/)?.[1];

async function going(title: string) {
  const host = await person("Host");
  const invite = (await postInvite(host, title, 4))!;
  const joiner = await person("Joiner");
  await post("/api/join", { invite }, joiner);
  return { host, invite, joiner };
}

it("lets only the people going read the chat or write in it", async () => {
  const { host, invite, joiner } = await going("Spec check: chat for those going");
  const stranger = await person("Stranger");

  expect(refused(await say(joiner, invite, "Hi all, see you there"))).toBeUndefined();
  expect(await (await chat(host, invite)).text()).toContain("Hi all, see you there");

  const peek = await chat(stranger, invite);
  expect(peek.status).toBe(403);
  expect(await peek.text()).not.toContain("Hi all, see you there");

  expect(refused(await say(stranger, invite, "Let me in"))).toBe("not-going");
  expect(await (await chat(host, invite)).text()).not.toContain("Let me in");
});

it("refuses an empty message or one that's too long", async () => {
  const { invite, joiner } = await going("Spec check: chat limits");
  expect(refused(await say(joiner, invite, "   "))).toBe("message");
  expect(refused(await say(joiner, invite, "x".repeat(501)))).toBe("message");
});

it("closes the chat to someone who leaves, and keeps what they wrote for the others", async () => {
  const { host, invite, joiner } = await going("Spec check: chat after leaving");
  await say(joiner, invite, "Sorry, something came up");
  await post("/api/join", { invite, action: "leave" }, joiner);

  expect((await chat(joiner, invite)).status).toBe(403);
  expect(refused(await say(joiner, invite, "Still here?"))).toBe("not-going");
  expect(await (await chat(host, invite)).text()).toContain("Sorry, something came up");
});

it("shows someone who joins late what was said before they joined", async () => {
  const { host, invite } = await going("Spec check: chat for late joiners");
  await say(host, invite, "Bring a water bottle");
  const late = await person("Late");
  await post("/api/join", { invite }, late);
  expect(await (await chat(late, invite)).text()).toContain("Bring a water bottle");
});

it("keeps a cancelled Vybe's chat open to the people who were going", async () => {
  const { host, invite, joiner } = await going("Spec check: chat after cancelling");
  await post("/api/cancel", { invite }, host);
  expect((await chat(joiner, invite)).status).toBe(200);
  expect(refused(await say(joiner, invite, "Another day?"))).toBeUndefined();
  expect(await (await chat(host, invite)).text()).toContain("Another day?");
});

it("tells only the people going that there's a new message, and never what it says", async () => {
  const { host, invite, joiner } = await going("Spec check: chat goes live");
  const [inside, outside] = await Promise.all([listen(joiner), listen(await person("Stranger"))]);
  const before = { inside: inside.events.length, outside: outside.events.length };

  await say(host, invite, "a private hello");

  const started = Date.now();
  const about = (events: string[]) =>
    events.map(parse).filter(([name, data]) => name === "chat" && (data as { invite?: number }).invite === Number(invite));
  while (about(inside.events.slice(before.inside)).length === 0) {
    if (Date.now() - started > WITHIN_MS) throw new Error(`no chat event within ${WITHIN_MS} ms`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  // give a wrongly addressed event the same time to arrive
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(about(outside.events.slice(before.outside)), "a stranger heard about it").toHaveLength(0);
  for (const event of [...inside.events, ...outside.events]) expect(event).not.toContain("a private hello");
});
