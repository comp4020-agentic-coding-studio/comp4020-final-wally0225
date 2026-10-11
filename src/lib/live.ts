// Every page open right now, as the stream that reaches it (see
// src/pages/api/events.ts). Kept in memory: Vybe runs on one machine (fly.toml,
// deployed with --ha=false), so every open page is connected to this process.
// A second machine would need a shared channel between them instead.
type Listener = (event: string) => void;

const listeners = new Set<Listener>();

export function listen(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Something about this invite changed: it was posted, or someone joined or
// left. Pages refetch rather than being sent the change itself, so the server
// stays the one place that decides what a card shows.
export function announce(inviteId: number) {
  const event = `event: change\ndata: ${JSON.stringify({ invite: inviteId })}\n\n`;
  for (const listener of listeners) listener(event);
}
