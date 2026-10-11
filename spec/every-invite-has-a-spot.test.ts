import { expect, it } from "vitest";
import { ANU, person, post, soon } from "./support";

// "Close enough to just go" needs every new invite on the map: the host taps
// the spot when posting, and the app refuses an invite without one, or with
// one nowhere near ANU (Vybe is for ANU students).

const invite = { title: "Spec check: a spot on the map", place: "Somewhere", size: "4" };

it("refuses an invite with no spot on the map", async () => {
  const host = await person("Host");
  const res = await post("/api/invites", { ...invite, ...soon(5) }, host);
  expect(res.headers.get("location")).toMatch(/error=spot/);
});

it("refuses a spot nowhere near ANU", async () => {
  const host = await person("Host");
  // Sydney Opera House
  const res = await post("/api/invites", { ...invite, ...soon(5), lat: "-33.8568", lng: "151.2153" }, host);
  expect(res.headers.get("location")).toMatch(/error=spot/);
});

it("posts an invite with a spot near ANU", async () => {
  const host = await person("Host");
  const res = await post("/api/invites", { ...invite, ...soon(5), ...ANU }, host);
  expect(res.headers.get("location")).toMatch(/#invite-\d+$/);
});
