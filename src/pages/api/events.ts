import type { APIRoute } from "astro";
import { currentPerson } from "../../lib/identity";
import { listen } from "../../lib/live";

// Fly's proxy closes a connection that's quiet for a minute, so the stream
// sends a comment line more often than that.
const HEARTBEAT_MS = 25_000;

// The live stream an open page listens on, as server-sent events: one
// "change" event per invite posted, joined or left. Only for people the app
// knows, since only they see the list.
export const GET: APIRoute = ({ cookies, request }) => {
  if (!currentPerson(cookies)) return new Response(null, { status: 401 });

  const encoder = new TextEncoder();
  let stop = () => {};

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      // if the connection drops, the browser tries again after two seconds
      send("retry: 2000\n\n");
      const unlisten = listen(send);
      const heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);
      stop = () => {
        unlisten();
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
