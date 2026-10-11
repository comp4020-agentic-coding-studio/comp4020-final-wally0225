import type { APIRoute } from "astro";
import { currentPerson } from "../../lib/identity";
import { viewing } from "../../lib/live";

// No list has more cards on it than this.
const MAX_CARDS = 200;

// An open page saying which invite cards are on its screen right now, for the
// viewer count: { stream, invites }, where stream is the id its live stream
// gave it. An empty list means none (scrolled away, or the tab is hidden).
export const POST: APIRoute = async ({ request, cookies }) => {
  const person = currentPerson(cookies);
  if (!person) return new Response(null, { status: 401 });

  const body: unknown = await request.json().catch(() => undefined);
  const { stream, invites } = (body ?? {}) as { stream?: unknown; invites?: unknown };
  if (
    typeof stream !== "string" ||
    !Array.isArray(invites) ||
    invites.length > MAX_CARDS ||
    !invites.every((i) => Number.isInteger(i))
  ) {
    return new Response(null, { status: 400 });
  }

  if (!viewing(stream, person.id, invites)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204 });
};
