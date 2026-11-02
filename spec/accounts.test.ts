import { expect, it } from "vitest";
import { PASSWORD, baseUrl, cookieFrom, post, postInvite, uniqueName } from "./support";

// Nobody uses Vybe without an account: they sign up with a username and a
// password (at least 8 characters, an uppercase and a lowercase letter), and
// log in with them afterwards.

const home = async (cookie?: string) => (await fetch(baseUrl, { headers: cookie ? { cookie } : {} })).text();
const where = (res: Response) => res.headers.get("location") ?? "";

it("only accepts a password of 8+ characters with an uppercase and a lowercase letter", async () => {
  const rules: [string, boolean][] = [
    ["Abcdefg", false], // 7 characters
    ["abcdefgh1", false], // no uppercase
    ["ABCDEFGH1", false], // no lowercase
    ["12345678", false],
    ["", false],
    ["Abcdefgh", true], // exactly 8; digits and symbols aren't required
    ["a long Passphrase with spaces", true],
  ];
  for (const [password, ok] of rules) {
    const res = await post("/api/signup", { username: uniqueName("pw"), password });
    if (ok) expect(cookieFrom(res), `"${password}" should be allowed`).toBeDefined();
    else {
      expect(where(res), `"${password}" should be refused`).toMatch(/error=password/);
      expect(cookieFrom(res), "a refused sign-up still logged them in").toBeUndefined();
    }
  }
});

it("asks for a username of 3 to 30 letters, digits, dots, dashes and underscores", async () => {
  for (const username of ["ab", "has space", "x".repeat(31), "emoji😀name", ""]) {
    const res = await post("/api/signup", { username, password: PASSWORD });
    expect(where(res), JSON.stringify(username)).toMatch(/error=username/);
  }
});

it("signs someone up, logs them in, and shows who they are", async () => {
  const username = uniqueName("Newbie");
  const res = await post("/api/signup", { username, password: PASSWORD });
  const cookie = cookieFrom(res)!;
  expect(cookie).toBeDefined();
  expect(await home(cookie)).toContain(username);
  // the cookie is a session, not the password, and not the name
  expect(cookie).not.toContain(PASSWORD);
  expect(cookie).not.toContain(username);
});

it("won't let two people share a username, whatever the capitals", async () => {
  const username = uniqueName("Taken");
  await post("/api/signup", { username, password: PASSWORD });
  for (const again of [username, username.toUpperCase(), username.toLowerCase()]) {
    const res = await post("/api/signup", { username: again, password: "Different-pw9" });
    expect(where(res), again).toMatch(/error=taken/);
    expect(cookieFrom(res)).toBeUndefined();
  }
});

it("logs in with the username and password they signed up with, and no other", async () => {
  const username = uniqueName("Returning");
  await post("/api/signup", { username, password: PASSWORD });

  const good = await post("/api/login", { username, password: PASSWORD });
  const cookie = cookieFrom(good)!;
  expect(cookie).toBeDefined();
  expect(await home(cookie)).toContain(username);

  // usernames aren't case-sensitive, passwords are
  expect(cookieFrom(await post("/api/login", { username: username.toUpperCase(), password: PASSWORD }))).toBeDefined();

  for (const password of [PASSWORD.toLowerCase(), PASSWORD + "x", "", "Wrong-pw-123"]) {
    const bad = await post("/api/login", { username, password });
    expect(where(bad), password).toMatch(/error=login/);
    expect(cookieFrom(bad), "a wrong password logged them in").toBeUndefined();
  }
});

it("doesn't say whether it was the username or the password that was wrong", async () => {
  const username = uniqueName("Leaky");
  await post("/api/signup", { username, password: PASSWORD });
  const wrongPassword = await post("/api/login", { username, password: "Wrong-pw-123" });
  const noSuchPerson = await post("/api/login", { username: uniqueName("Nobody"), password: "Wrong-pw-123" });
  expect(where(noSuchPerson)).toBe(where(wrongPassword));
});

it("keeps people who aren't logged in out of everything but the front page and the README", async () => {
  expect((await fetch(baseUrl)).status).toBe(200);
  expect((await fetch(new URL("/readme/", baseUrl))).status).toBe(200);

  const html = await home();
  expect(html, "the form to post was on the page").not.toContain('action="/api/invites"');
  expect(html).toMatch(/action="\/api\/signup"|href="\/signup"/);
  expect(html).toMatch(/href="\/login"|action="\/api\/login"/);

  expect(where(await post("/api/invites", { title: "x", place: "y" }))).toBe("/");
  expect(await postInvite("", "Spec check: signed out", 4)).toBeUndefined();
  for (const path of ["/groups", "/chat/1", "/edit/1"]) {
    const res = await fetch(new URL(path, baseUrl), { redirect: "manual" });
    expect(res.status, path).toBe(302);
  }
  expect((await fetch(new URL("/api/events", baseUrl))).status, "the live stream was open to anyone").toBe(401);
});

it("no longer lets anyone in with just a first name", async () => {
  const res = await post("/api/name", { name: "Sneaky" });
  expect(cookieFrom(res)).toBeUndefined();
});

it("logging out ends the session on the server, not just in the browser", async () => {
  const username = uniqueName("Leaver");
  const cookie = cookieFrom(await post("/api/signup", { username, password: PASSWORD }))!;
  expect(await home(cookie)).toContain(username);

  await post("/api/logout", {}, cookie);
  // the old cookie is useless even if someone kept a copy
  expect(await home(cookie)).not.toContain(username);
  expect(where(await post("/api/invites", { title: "x", place: "y" }, cookie))).toBe("/");
});

it("keeps one person's session from being another's", async () => {
  const [a, b] = await Promise.all(["Aa", "Bb"].map(async (n) => cookieFrom(await post("/api/signup", { username: uniqueName(n), password: PASSWORD }))!));
  expect(a).not.toBe(b);
  // a made-up session token gets nowhere
  expect(await home("session=" + "0".repeat(64))).not.toContain('action="/api/invites"');
  expect(await home(a)).toContain('action="/api/invites"');
});

it("stops guessing at one account after too many wrong passwords, even for the right one", async () => {
  const username = uniqueName("Guessed");
  await post("/api/signup", { username, password: PASSWORD });

  let locked = false;
  for (let i = 0; i < 12 && !locked; i++) {
    const res = await post("/api/login", { username, password: `Wrong-guess-${i}` });
    expect(cookieFrom(res), "a wrong password logged them in").toBeUndefined();
    locked = /error=locked/.test(where(res));
  }
  expect(locked, "twelve wrong passwords were all just 'wrong'").toBe(true);

  // locked out means the right password doesn't work either, for now
  const right = await post("/api/login", { username, password: PASSWORD });
  expect(where(right)).toMatch(/error=locked/);
  expect(cookieFrom(right), "the right password got in while locked out").toBeUndefined();
  // the lockout is also the same whatever the capitals
  expect(where(await post("/api/login", { username: username.toUpperCase(), password: PASSWORD }))).toMatch(/error=locked/);
});

it("keeps one account's lockout from locking anyone else out", async () => {
  const [a, b] = [uniqueName("Targeted"), uniqueName("Bystander")];
  await post("/api/signup", { username: a, password: PASSWORD });
  await post("/api/signup", { username: b, password: PASSWORD });
  for (let i = 0; i < 12; i++) await post("/api/login", { username: a, password: `Wrong-guess-${i}` });

  expect(cookieFrom(await post("/api/login", { username: b, password: PASSWORD })), "a bystander was locked out").toBeDefined();
});
