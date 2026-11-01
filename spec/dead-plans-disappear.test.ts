import Database from "better-sqlite3";
import { expect, it } from "vitest";
import { baseUrl, person, post, postInvite, usernames } from "./support";

// Dead plans disappear, but your trace doesn't: once a Vybe has ended it
// leaves the list, nobody can join it, and the people who went keep it in
// their past plans, with who they went with. (A cancelled Vybe leaving
// everyone else's list is checked in only-the-host-cancels.test.ts.)
//
// A Vybe can't be posted in the past, and waiting for one to end takes ten
// minutes, so this moves a Vybe's times into the past in the app's own
// database. That only works when the check can reach that database: it runs
// when DATABASE_PATH points at a local throwaway one, and is skipped
// otherwise (in CI the app runs in a container, so it is skipped there).
const dbPath = process.env.DATABASE_PATH;
const local = /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(baseUrl + "/");
const runnable = Boolean(dbPath) && local;

const page = async (cookie: string) => (await fetch(baseUrl, { headers: { cookie } })).text();
// the home page splits at the "Past plans" heading
const split = (html: string) => {
  const at = html.indexOf('id="past-plans"');
  return { upcoming: at < 0 ? html : html.slice(0, at), past: at < 0 ? "" : html.slice(at) };
};

function endIt(invite: string) {
  const db = new Database(dbPath!);
  const hour = 3_600_000;
  db.prepare("UPDATE invites SET starts_at = ?, ends_at = ? WHERE id = ?").run(Date.now() - 2 * hour, Date.now() - hour, Number(invite));
  db.close();
}

it.runIf(runnable)("takes an ended Vybe off the list, keeps it in past plans for those who went, and shuts out everyone else", async () => {
  const host = await person("Host");
  const invite = (await postInvite(host, "Spec check: ended plan", 4))!;
  const joiner = await person("Joiner");
  await post("/api/join", { invite }, joiner);
  const stranger = await person("Stranger");

  for (const who of [host, joiner, stranger]) {
    expect(split(await page(who)).upcoming, "not on the list yet").toContain("Spec check: ended plan");
  }

  endIt(invite);

  for (const who of [host, joiner, stranger]) {
    expect(split(await page(who)).upcoming, "an ended Vybe is still on the list").not.toContain("Spec check: ended plan");
  }

  // the trace: past plans for each person who went, naming who they went with
  const hostPast = split(await page(host)).past;
  const joinerPast = split(await page(joiner)).past;
  expect(hostPast).toContain("Spec check: ended plan");
  expect(hostPast, "the host's past plan doesn't show who came").toContain(usernames.get(joiner)!);
  expect(joinerPast).toContain("Spec check: ended plan");
  expect(joinerPast, "the joiner's past plan doesn't show who they went with").toContain(usernames.get(host)!);

  // it's theirs alone: someone who didn't go has no trace of it
  expect(await page(stranger)).not.toContain("Spec check: ended plan");

  // and nobody can join a Vybe that's over
  const late = await post("/api/join", { invite }, stranger);
  expect(late.headers.get("location")).toMatch(/error=gone/);
});

it.runIf(!runnable)("needs a local throwaway database to end a Vybe (skipped here)", () => {
  // Not a check of the app: it only says why the one above didn't run, so a
  // skipped run is visible as this test passing rather than as nothing.
  expect(runnable).toBe(false);
});
