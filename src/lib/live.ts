import { randomUUID } from "node:crypto";

// Every page open right now, as the stream that reaches it (see
// src/pages/api/events.ts). Kept in memory: Vybe runs on one machine (fly.toml,
// deployed with --ha=false), so every open page is connected to this process.
// A second machine would need a shared channel between them instead.
interface Page {
  personId: string;
  send: (text: string) => void;
  // the invites whose cards are on this page's screen right now
  viewing: Set<number>;
}

const pages = new Map<string, Page>();

const event = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

// A page opening its stream. It's told its id, which it reports what it's
// showing under, and the counts as they stand.
export function open(personId: string, send: (text: string) => void): () => void {
  const id = randomUUID();
  const page: Page = { personId, send, viewing: new Set() };
  pages.set(id, page);
  send(event("hello", { stream: id }));
  send(event("viewers", countsFor(page)));
  return () => {
    pages.delete(id);
    if (page.viewing.size > 0) countsChanged();
  };
}

// Something about this invite changed: it was posted, or someone joined or
// left. Pages refetch rather than being sent the change itself, so the server
// stays the one place that decides what a card shows.
export function announce(inviteId: number) {
  const text = event("change", { invite: inviteId });
  for (const page of pages.values()) page.send(text);
}

// A new message in an invite's chat, told only to the people going: just
// which invite, never what was said or by whom. Their chat page fetches the
// messages, and the server checks again that they're still going.
export function chatted(inviteId: number, people: string[]) {
  const text = event("chat", { invite: inviteId });
  const to = new Set(people);
  for (const page of pages.values()) if (to.has(page.personId)) page.send(text);
}

// A page saying which cards are on its screen. Only its own person can say
// it; false if the page isn't theirs (or has closed).
export function viewing(streamId: string, personId: string, invites: number[]): boolean {
  const page = pages.get(streamId);
  if (!page || page.personId !== personId) return false;
  page.viewing = new Set(invites);
  countsChanged();
  return true;
}

// How many people are looking at each invite, as one page should be told:
// a person counts once however many of their pages show the card, they never
// count themselves, and an invite nobody else is looking at is left out.
// Only numbers leave here, never who.
function countsFor(page: Page): Record<number, number> {
  const people = new Map<number, Set<string>>();
  for (const other of pages.values()) {
    if (other.personId === page.personId) continue;
    for (const invite of other.viewing) {
      if (!people.has(invite)) people.set(invite, new Set());
      people.get(invite)!.add(other.personId);
    }
  }
  return Object.fromEntries([...people].map(([invite, who]) => [invite, who.size]));
}

// Scrolling sends a report every few moments, from every page; the counts go
// out at most this often, which still lands within about a second.
const COUNTS_EVERY_MS = 250;
let countsPending: NodeJS.Timeout | undefined;

function countsChanged() {
  countsPending ??= setTimeout(() => {
    countsPending = undefined;
    for (const page of pages.values()) page.send(event("viewers", countsFor(page)));
  }, COUNTS_EVERY_MS);
}
