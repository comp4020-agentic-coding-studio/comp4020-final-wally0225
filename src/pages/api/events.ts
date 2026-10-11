import type { APIRoute } from "astro";
import { currentPerson } from "../../lib/identity";
import { open } from "../../lib/live";

// Fly's proxy closes a connection that's quiet for a minute, so the stream
// sends a comment line more often than that.
const HEARTBEAT_MS = 25_000;

// The live stream an open page listens on, as server-sent events: "hello"
// with the page's id, one "change" per invite posted, joined or left, and
// "viewers" whenever the counts of who's looking move. Only for people the
// app knows, since only they see the list.
export const GET: APIRoute = ({ cookies, request }) => {
  const person = currentPerson(cookies);
  if (!person) return new Response(null, { status: 401 });

  const encoder = new TextEncoder();
  let stop = () => {};

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // a connection that died without saying so fails here; dropping it
      // keeps one dead page from stopping the counts reaching everyone else
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };
      // if the connection drops, the browser tries again after two seconds
      send("retry: 2000\n\n");
      const close = open(person.id, send);
      const heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);
      stop = () => {
        close();
        clearInterval(heartbeat);
      };
      request.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      stop();
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
};
