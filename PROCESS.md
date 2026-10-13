# Process overview

This is how Vybe got from the brief to the app deployed at [comp4020-final-wally0225.fly.dev](https://comp4020-final-wally0225.fly.dev/), as of week 10. People post Vybes (what, where, when, how many), join them, late if they need to, and come back to their past plans. Every change shows live on everyone else's page within about a second, and every Vybe is on a map. I rewrite this file at each crit.

I worked in Claude Code. Claude Code drafted this version from my decisions and my answers to its questions, and I edited it.

## Where the idea came from

Vybe started last semester as a group pitch in another course. I had the initial idea; the deck was the whole group's work. The pitch was a city-wide platform with profiles, AI matching, reputation scores and venue partnerships. This brief asks for small, and a matching app with twelve users mostly shows an empty list, so I kept the core, an invite only works if people see it while it's still open, and dropped everything that was there to grow a business. I chose ANU students because I'm one, my pod is, and so is the showcase audience.

## Choosing the stack

Astro in server mode with SQLite (through Drizzle) on the Fly volume, the stack I shipped in crit 7 ([`0226dd0`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/0226dd0)). Knowing how it deploys meant my effort went into what good means, not tooling. I looked at Hono with `ws` and at SvelteKit; both meant learning a framework in the same week as deciding what the app is for.

In week 9 I named real-time as the risk: I'd switch if Astro's server-sent events didn't hold. They held ([`24ec588`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/24ec588)). Updates only flow from the server to people watching, so I didn't need WebSockets. Because Vybe runs on one machine, the server keeps every open page in memory; a second machine would need a shared channel. For the map I used Leaflet with OpenStreetMap tiles: free, no API key, and nothing about users goes to a third party.

## How I worked with the agent

I make the product decisions; the agent proposes options, builds them and tests them. I agree a plan before any code, then one behaviour per commit. Earlier decisions were mine: rescoping the pitch, one list instead of "now" versus "plan ahead", late joins up to an hour before the end ([`cdff9e1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/cdff9e1)).

For crit 9, when the agent asked me to pick from four concurrency decisions, I stopped it and asked for explanations first, then decided all four:

- **Wait while joining.** A live update could reset the arrival time someone is choosing, so updates hold until they leave the form ([`f51fcbd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/f51fcbd)). The cost: if the last spot goes, they learn from the "filled up" message, not a live flip.
- **Coming back after sleep** refreshes silently and says how many Vybes changed ([`109871b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/109871b)).
- **Who sees whom:** a count of others looking, never who. This is the decision I'll defend: [docs/decisions/0001-viewer-count.md](docs/decisions/0001-viewer-count.md). The agent read my README's "nobody sees who looked" as ruling that out; I corrected it, "who" means names, and reworded the README to say so.

Then I added the map, using Airbnb's map search as my reference. I answered the agent's questions before it planned: the host taps the spot when posting, because "where" in words can't be put on a map; the map opens on about 1 km around you, then whatever area is visible is the search; refusing GPS starts from ANU; your own plans always show. The list stays one full list with a Soonest | Nearest switch rather than replacing "soonest first". When the agent suggested keeping your location on your phone, I agreed, so the server sends the same list to everyone and the page sorts it, which keeps "what you do on the list stays private" true.

I also directed the look: Vybes instead of "invites", so the brand is the noun ([`145d79f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/145d79f)), and a card with a date block and one Join button ([`6c9412c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/6c9412c)).

## Checking and correcting the work

The first claim I tested was "full means full" ([`88946dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/88946dd)): six people race for two spots and exactly two get in. We removed the capacity rule on purpose, saw the test fail, and put it back.

Since then I write checks before code, so each starts red: live updates ([`cdee7fc`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/cdee7fc) → [`24ec588`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/24ec588)), the viewer count ([`0f6156c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/0f6156c) → [`c2265e1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/c2265e1)), and every Vybe having a spot near ANU ([`e8ff393`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/e8ff393) → [`4c81b4b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/4c81b4b)). One correction landed in `spec/`: checks run in parallel, so another check's post could make the live-update check pass with nothing working. Now the update has to name the Vybe that changed.

The checks only see the server, so the agent drove headless Chrome at phone and laptop widths, with a fake GPS position and with location refused, and I reviewed the screenshots. That caught things the checks couldn't: Vybes at the same spot hiding each other, now one numbered pin. I corrected two layouts by eye: the popup's padding hid the Join button ([`66df792`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/66df792)), and posting on a laptop looked wrong as a narrow column, so it became a dialog with a tall map.

I tested live with a normal and a private window as two people, ran every check against the deployed site, then used my phone and laptop together.

The corrections now live in the harness. `CLAUDE.md` holds my rule for every choice (better for the user, something the app can actually do, logic that holds up), what the app must never do, and the corrections from this week: explain options before asking me to choose, and check the page in a browser because the checks can't see it.

## What changed this week, and what's next

In week 9 I planned to show "Someone is looking". I chose a number instead: it's more realistic, and seeing others consider a Vybe encourages joining before the spots go. My pod will argue that's close to the pressure the app is trying to remove; the ADR says why I accept it. The map was this week's other big change: "close enough to just go" is now in the README, and it shaped what the list shows.

Next is checks for my other README claims ("every Vybe says what, where and when", "late is fine, within reason").
