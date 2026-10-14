import { expect, it } from "vitest";
import { ANU, baseUrl, person, post, soon } from "./support";

// A Vybe can carry one tag from a fixed list (Sport, Study, Food...), so the
// list can be filtered by what people feel like doing. The tag shows on the
// card; anything not on the list is refused.

const vybe = (title: string, tag: string) => ({ title, place: "Nowhere", ...soon(5), size: "4", ...ANU, tag });

it("shows a Vybe's tag on its card, and refuses a tag that isn't on the list", async () => {
  const host = await person("Host");
  const res = await post("/api/invites", vybe("Spec check: tagged", "sport"), host);
  const invite = res.headers.get("location")?.match(/#invite-(\d+)$/)?.[1];
  expect(invite, "posting a tagged Vybe didn't land on it").toBeDefined();

  const page = await (await fetch(baseUrl, { headers: { cookie: host } })).text();
  const card = page.match(new RegExp(`<li[^>]*id="invite-${invite}"[\\s\\S]*?</li>`))?.[0];
  expect(card).toMatch(/data-tag="sport"/);
  expect(card).toMatch(/>Sport</);

  const odd = await post("/api/invites", vybe("Spec check: odd tag", "rave"), host);
  expect(odd.headers.get("location")).toMatch(/error=tag/);
});
