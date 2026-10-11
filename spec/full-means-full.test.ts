import { expect, it } from "vitest";
import { baseUrl, person, post, postInvite } from "./support";

// "Full means full": when an invite has one spot left and several people try
// to take it at once, exactly one gets it and the rest are told it filled up.
// A group chat can't promise this; the headcount on an invite is only worth
// trusting if it holds. Like every check in spec/, this runs against the
// RUNNING app over HTTP.

it("never lets more people join than the invite has room for", async () => {
  const host = await person("Host");
  const invite = await postInvite(host, "Spec check: full means full", 3);
  expect(invite, "posting the invite didn't land on it").toBeDefined();

  // two spots left after the host; six people go for them at the same moment
  const racers = await Promise.all(Array.from({ length: 6 }, (_, i) => person(`Racer ${i + 1}`)));
  const outcomes = await Promise.all(
    racers.map(async (cookie) => {
      const joined = await post("/api/join", { invite: invite! }, cookie);
      return joined.headers.get("location") ?? "";
    }),
  );

  expect(outcomes.filter((to) => to.endsWith(`#invite-${invite}`))).toHaveLength(2);
  expect(outcomes.filter((to) => to.includes("error=full"))).toHaveLength(4);

  // and the page agrees with what each of them was told
  const page = await (await fetch(baseUrl, { headers: { cookie: host } })).text();
  expect(page).toMatch(/3 of 3 going/);
});
