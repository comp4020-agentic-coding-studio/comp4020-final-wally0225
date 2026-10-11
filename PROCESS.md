# Process overview

This is how Vybe got from the brief to the app deployed at [comp4020-final-wally0225.fly.dev](https://comp4020-final-wally0225.fly.dev/), as of week 10. People can post invites, join them (late if they need to), come back to their past plans, and now see every change live: a post or a join shows on everyone else's page within about a second, without a reload. I rewrite this file at each crit.

I worked in Claude Code. Claude Code drafted this version from my decisions and my answers to its questions, and I edited it.

## Where the idea came from

Vybe started in another course last semester as a group pitch. I had the initial idea, and the deck was the whole group's work. The pitch was a city-wide platform, "I want to do X now, find people immediately", with profiles, AI matching, reputation scores and venue partnerships.

The core idea fit this brief: an invite only works if people see it while it's still available. The platform didn't. This brief asks for small, and a matching app with twelve users mostly shows an empty list. So I kept the core and dropped everything that was there to grow a business. I chose ANU students rather than one residential hall, because I'm one, my pod is, and so is the showcase audience, and I don't live in a hall so couldn't test it there.

## Choosing the stack

I used Astro in server mode with SQLite (through Drizzle) on the Fly volume, the same stack I shipped in crit 7 ([`0226dd0`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/0226dd0), [`202043d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/202043d)). Because I already knew how it deploys, my effort went into deciding what good means instead of into tooling. It fits the course's one 256 MB machine, and one SQLite file on the volume is the whole state. I also looked at Hono with the `ws` library, which gives more control over real-time, and SvelteKit, which is smoother for an interactive UI; both meant learning a new framework in the same week as deciding what the app is for.

In week 9 I named real-time as the known risk: Astro can stream server-sent events, and I'd switch if that didn't hold. It held ([`24ec588`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/24ec588)). Updates only flow from the server to the people watching, plus a small report from each page of what it's showing, so I didn't need WebSockets. Because Vybe runs on one machine, the server keeps every open page in memory. A second machine would need a shared channel; at this size it doesn't need one.

## How I worked with the agent

I make the product decisions; the agent proposes options, builds them and tests them. The decisions that shaped the app before this week were mine: rescoping the pitch, one list soonest-first instead of "now" versus "plan ahead", end times in five-minute steps ([`42bff71`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/42bff71)), late joins up to an hour before the end ([`cdff9e1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/cdff9e1)), and the Tiffany-blue look instead of the agent's first purple, dark design ([`492343b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/492343b)).

This week I agreed a plan with the agent before any code: transport first, then one behaviour per commit, deploy last. When it asked me to pick from four concurrency decisions, I stopped and asked it to explain them first, then decided all four myself:

- **What a card does while someone is joining.** The agent showed me that a live swap could reset the arrival time someone is choosing, or move the Join button they're about to press. I chose to wait: updates hold until they leave the form ([`f51fcbd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/f51fcbd)). It pointed out this conflicts with a card flipping to "Full" under their thumb; I kept waiting and accepted that they'll learn from the "filled up" message instead. Full still means full, because the server refuses the join.
- **Coming back after the phone sleeps.** The page refreshes without asking, then says how many invites changed, so things moving around isn't a mystery ([`109871b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/109871b)).
- **Who sees whom.** Others see how many people are looking at an invite, never who. This is the decision I recorded and will defend: [docs/decisions/0001-viewer-count.md](docs/decisions/0001-viewer-count.md).

I also corrected how the agent read my own README. It flagged the viewer count as clashing with "nobody sees who looked and didn't join". I explained that "who" means names: other people's behaviour stays private, and the number only shows interest. That's the line the count is built on, and a check now holds it.

## Checking and correcting the work

The first claim I tested was "full means full" ([`88946dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/88946dd)): six people race for the last two spots and exactly two get in. To check the test protects the claim, we removed the capacity rule on purpose, saw it fail, and put the rule back.

This week I chose to write the checks before the code, so each one starts red. The live-update check went red in [`cdee7fc`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/cdee7fc) and green in [`24ec588`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/24ec588); the viewer-count checks went red in [`0f6156c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/0f6156c) and green in [`c2265e1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/c2265e1). One correction landed in `spec/` before it could mislead me: the checks run in parallel, so another check posting an invite could make the live-update check pass with nothing working. Now the update has to name the invite that changed.

I tested in a normal and a private browser window as two people, then ran every check against the live site, then on my phone and laptop together. The checks only see the server, so what the page does on screen (holding while joining, the "changed" note) I checked by hand.

What's still missing is the harness. `CLAUDE.md` is empty, so the rule I used for every choice this week, better for the user, something the app can actually do, and logic that holds up, lives only in my head. Putting it there is next.

## What changed this week, and what's next

The biggest change was in my own plan. In week 9 I wrote that I'd show "Someone is looking" instead of who. Building it, I chose a number instead: it's more realistic, and if people see many others considering an invite, they're more likely to join before the spots go. The cost, which my pod will argue, is that it sits close to the pressure the app is trying to remove. The ADR says why I accept it.

Next is the harness, and turning my other README claims ("every invite says what, where and when", "late is fine, within reason") into checks.
