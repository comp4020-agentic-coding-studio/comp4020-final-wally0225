import { MAX_HOURS, MAX_SIZE } from "./db";
import { ANU, MAX_KM_FROM_ANU, distanceKm } from "./geo";
import { isTag } from "./tags";
import { onStep, parseLocal } from "./time";

export interface Details {
  title: string;
  place: string;
  startsAt: Date;
  endsAt: Date;
  size: number;
  lat: number;
  lng: number;
  tag: string | null;
}

// What posting a Vybe and editing one both ask for, with the same rules, so
// the two can't drift apart. Returns the error code the page explains.
export function readDetails(form: FormData): Details | { error: string } {
  const title = String(form.get("title") ?? "").trim();
  const place = String(form.get("place") ?? "").trim();
  const date = String(form.get("date") ?? "");
  const startTime = String(form.get("startTime") ?? "");
  const endTime = String(form.get("endTime") ?? "");
  const size = Number(form.get("size"));
  const lat = Number(form.get("lat") || NaN);
  const lng = Number(form.get("lng") || NaN);

  // what, where and when are all required: a plan missing one of them is the
  // group-chat message everyone forgets
  if (!title || title.length > 80 || !place || place.length > 80) return { error: "details" };

  // times come from the five-minute dropdowns; anything else is refused
  const startsAt = onStep(startTime) ? parseLocal(`${date}T${startTime}`) : undefined;
  if (!startsAt || startsAt <= new Date()) return { error: "time" };

  let endsAt = onStep(endTime) ? parseLocal(`${date}T${endTime}`) : undefined;
  if (endsAt && endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86_400_000);
  if (!endsAt || endsAt.getTime() - startsAt.getTime() > MAX_HOURS * 3_600_000) return { error: "end" };

  if (!Number.isInteger(size) || size < 2 || size > MAX_SIZE) return { error: "size" };

  // the spot the host tapped on the map; "where" in words isn't enough to
  // put it on anyone else's map
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || distanceKm({ lat, lng }, ANU) > MAX_KM_FROM_ANU) {
    return { error: "spot" };
  }

  // optional, but from the list if given
  const tagField = String(form.get("tag") ?? "");
  if (tagField && !isTag(tagField)) return { error: "tag" };

  return { title, place, startsAt, endsAt, size, lat, lng, tag: tagField || null };
}
