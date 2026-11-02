import { ANU, MAX_KM_FROM_ANU, distanceKm } from "./geo";

// Place search for the post form: suggestions as someone types "Where", and a
// name for a spot they tap on the map. Photon (photon.komoot.io) answers both
// from OpenStreetMap data, free and with no key, and allows calls straight
// from the browser. What it is sent: the words typed, ANU's coordinates to
// rank nearby places first, and the spot that was tapped. Never where the
// person is (see CLAUDE.md).

const PHOTON = "https://photon.komoot.io";

// A box around Canberra, so "sport" doesn't suggest Rome
const AROUND_CANBERRA = "148.8,-35.5,149.4,-35.1";

// The longest "where" the server accepts (src/lib/invite-details.ts)
const MAX_NAME = 80;

export interface Place {
  name: string;
  // the street and suburb, to tell two places of one name apart
  detail: string;
  lat: number;
  lng: number;
}

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

function toPlace(f: Feature): Place | undefined {
  const p = f.properties;
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const name = p.name ?? street;
  if (!name) return undefined;
  const [lng, lat] = f.geometry.coordinates;
  const detail = [p.name ? street : undefined, p.district ?? p.suburb ?? p.city].filter(Boolean).join(", ");
  return { name: name.slice(0, MAX_NAME), detail, lat, lng };
}

async function features(url: string, signal: AbortSignal): Promise<Feature[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`place search answered ${res.status}`);
  return ((await res.json()) as { features: Feature[] }).features;
}

// Places matching what's been typed, nearest ANU first. Anything the server
// would refuse as too far from ANU is left out, so a suggestion can always be
// posted.
export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    lat: String(ANU.lat),
    lon: String(ANU.lng),
    bbox: AROUND_CANBERRA,
    limit: "8",
    lang: "en",
  });
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const f of await features(`${PHOTON}/api/?${params}`, signal)) {
    const place = toPlace(f);
    if (!place || distanceKm(place, ANU) > MAX_KM_FROM_ANU) continue;
    const key = `${place.name}|${place.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }
  return places.slice(0, 6);
}

// What a tapped spot is called: a named place within about 80 m (a building,
// a court, an oval) over the street it's on, or undefined if there's nothing.
export async function nameAt(lat: number, lng: number, signal: AbortSignal): Promise<string | undefined> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), radius: "0.08", limit: "6", lang: "en" });
  const found = await features(`${PHOTON}/reverse?${params}`, signal);
  const named = found.filter((f) => f.properties.name);
  const pick = named.find((f) => f.properties.osm_key !== "highway") ?? named[0] ?? found[0];
  return pick ? toPlace(pick)?.name : undefined;
}
