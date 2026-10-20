# Process overview

This is how Vybe got from the brief to the app deployed at [comp4020-final-wally0225.fly.dev](https://comp4020-final-wally0225.fly.dev/), as of week 11. People post Vybes (what, where, when, how many), join them, late if they need to, and come back to their past plans. Every change shows live on everyone else's page within about a second, and every Vybe is on a map. Since crit 10, people also belong to groups, each Vybe has a chat for the people going, and the server decides who can see and change what, and logs who did it. I rewrite this file at each crit.

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

For crit 10 I listed the changes I wanted, and the agent asked me to decide the details before building:

- **The host can cancel.** I chose that a cancelled Vybe stays visible, marked, to the people who joined, so nobody turns up anyway, and disappears for everyone else ([`d9cc0f1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/d9cc0f1)).
- **Groups.** Anyone can start one and becomes its owner; anyone can join; only the owner and hosts post in it, once or weekly; a host can make another member a host, like access management. A group's Vybes show to everyone, labelled, but you join the group before you can join the Vybe ([`37e2f6c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/37e2f6c)). I also asked for tags and a week calendar with "Add to my phone's calendar" ([`b9158e2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/b9158e2), [`48b8bd8`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/48b8bd8)), and held back promos for restaurants and clubs.
- **Group pages with pictures.** I said the group page was too boring and asked for cards with images. The agent drew seven covers, one per tag, kept in the repo so nothing is hotlinked, and the owner picks one ([`8973dcf`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/8973dcf)).
- **A chat for each Vybe.** My README said "no chat", because the big group chat is what Vybe replaces. I changed that decision: this chat isn't the big one that buries the details. Only the people going can use it, and it's there to say hello or sort out a problem before you meet. I decided someone who leaves loses access but their messages stay, late joiners see what came before, a cancelled Vybe keeps its chat so people can ask about another day, and the messages are deleted from the database when the Vybe ends ([`9cbe94a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/9cbe94a)). I rewrote the README's chat line with that reason.

These rules are recorded in [docs/decisions/0002-who-can-see-and-change-what.md](docs/decisions/0002-who-can-see-and-change-what.md): each one is checked on the server, not just hidden in the page.

I also directed the look: Vybes instead of "invites", so the brand is the noun ([`145d79f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/145d79f)), and a card with a date block and one Join button ([`6c9412c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/6c9412c)).

## Checking and correcting the work

The first claim I tested was "full means full" ([`88946dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/88946dd)): six people race for two spots and exactly two get in. We removed the capacity rule on purpose, saw the test fail, and put it back.

Since then I write checks before code, so each starts red: live updates ([`cdee7fc`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/cdee7fc) → [`24ec588`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/24ec588)), the viewer count ([`0f6156c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/0f6156c) → [`c2265e1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/c2265e1)), and every Vybe having a spot near ANU ([`e8ff393`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/e8ff393) → [`4c81b4b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/4c81b4b)). One correction landed in `spec/`: checks run in parallel, so another check's post could make the live-update check pass with nothing working. Now the update has to name the Vybe that changed.

For crit 10 every rule got its check first: only the host cancels ([`3034cbe`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/3034cbe) → [`d9cc0f1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/d9cc0f1)), groups and their roles ([`aa77f7f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/aa77f7f) → [`37e2f6c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/37e2f6c)), tags and calendar export ([`e77cce3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/e77cce3) → [`b9158e2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/b9158e2)), only the owner changes a group's cover ([`00fc882`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/00fc882) → [`8973dcf`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/8973dcf)), and the chat being only for the people going ([`3a2c357`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/3a2c357) → [`9cbe94a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/9cbe94a)). The checks only reach the server, so deleting a chat when its Vybe ends was checked directly against a throwaway database: that Vybe's messages went, another's stayed. Every check runs against a throwaway database, never the live one.

The checks only see the server, so the agent drove headless Chrome at phone and laptop widths, with a fake GPS position and with location refused, and I reviewed the screenshots. That caught things the checks couldn't: Vybes at the same spot hiding each other, now one numbered pin. I corrected two layouts by eye: the popup's padding hid the Join button ([`66df792`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/66df792)), and posting on a laptop looked wrong as a narrow column, so it became a dialog with a tall map.

I tested live with a normal and a private window as two people, ran every check against the deployed site, then used my phone and laptop together. For crit 10 I ran the two-person test from the live URL, in separate Chrome profiles.

The browser checks caught crit 10's mistakes too: the tag filter row made the page wider than a phone, a group's name sat across its cover, and cleaning up old styles broke the group's letter mark. With two Chrome sessions on the chat, a message reached the other person in under a tenth of a second and their half-typed message survived the update. One run failed because the agent's test script only sent the login cookie to chat pages; the fault was in the script, not the app, and fixing the script made it pass.

The corrections now live in the harness. `CLAUDE.md` holds my rule for every choice (better for the user, something the app can actually do, logic that holds up), what the app must never do, and the corrections from this week: explain options before asking me to choose, and check the page in a browser because the checks can't see it.

## Who did what, in the logs

Every action is logged on the server as one line in `flyctl logs`: `[vybe] Ana(4a8cb473) join invite=12 result="joined" arrival="on time"`. A person is their first name and the start of their id, so two Anas can be told apart. Refusals are logged with why (`result="not-owner"`), so a refused attempt never reads as success; the agent first logged a refused promotion as "made host", and we changed it to "make host" with its result. Chat lines say who wrote in which Vybe and how long it was, never what it said, so I can show the logs to my pod without showing anyone's messages.

## What changed this week, and what's next

Crit 10 turned Vybe from one shared list into something people own parts of: their Vybes, their groups, their chats. The biggest change of mind was the chat: my README said no chat, and I changed it once I could say why this one is different from the group chat Vybe replaces. Every choice still went through my rule: better for the user, something the app can do, logic that holds up.

Next is trimming the README back under 600 words, and checks for my other README claims ("every Vybe says what, where and when", "late is fine, within reason").
