// Where the person using the page is, from the browser's location. Runs in
// the browser only, and the answer never leaves it: the page filters and
// sorts what it already has, and nothing about where someone is reaches the
// server ("What you do on the list stays private").

export type Spot = { lat: number; lng: number };

let found: Spot | undefined;

// Their spot, or undefined if the browser can't or won't say. With ask false
// it never prompts: it answers only if they've already allowed it, so a
// returning visitor gets distances without being asked again.
export async function locate(ask: boolean): Promise<Spot | undefined> {
  if (found) return found;
  if (!("geolocation" in navigator)) return undefined;
  if (!ask) {
    const state = await navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => p.state)
      .catch(() => undefined);
    if (state !== "granted") return undefined;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        found = { lat: position.coords.latitude, lng: position.coords.longitude };
        document.dispatchEvent(new CustomEvent("vybe:located"));
        resolve(found);
      },
      () => resolve(undefined),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
