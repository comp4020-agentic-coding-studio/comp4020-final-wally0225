# Process overview

This is how Vybe got from the brief to the app deployed at [comp4020-final-wally0225.fly.dev](https://comp4020-final-wally0225.fly.dev/), as of week 9. It's a first working version like MVP: people can post Vybe(invites), join them (late if they need to) and come back to their past plans, but it isn't real-time yet. I'll rewrite this file at each crit.

I worked in Claude Code. Claude Code help me draft this document to point out how I made Vybe to the current version with AI.

## Where the idea came from

Vybe started in another course I took last semester as a group pitch. I had the initial idea, and the deck was the whole group's work. The pitch was a city-wide platform: "I want to do X now, find people immediately" is our value proposition, with profiles, AI matching, reputation scores and venue partnerships.

The core idea fit this brief: an invite only works if people see it while it's still available. The platform didn't. This brief asks for small, and a matching app with twelve users mostly shows an empty list. So I kept the core and dropped everything that was there to grow a business.

I first thought about pointing it at one residential hall, but I don't live in one and couldn't test it there. I chose ANU students instead, because I'm one, my pod is, and so is the showcase audience. My reasons it beats the group chat come from my own experience: asking on the group chat is awkward for most of the people, messages get buried easily, you can't see who's in your invites, and people forget when and where after a while.

## Choosing the stack

I used Astro in server mode with SQLite (through Drizzle) on the Fly volume, the same stack I shipped in crit 7 ([`0226dd0`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/0226dd0),
[`202043d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/202043d)).
Because I already knew how it deploys, this week's effort went into deciding what good means instead of into tooling. It fits the course's one 256 MB machine, and one SQLite file on the volume is the whole state.

I also looked at Hono with plain HTML and the `ws` library, which is leaner and gives more control over real-time, and SvelteKit, which is smoother for an interactive UI. Both would have meant learning a new framework in the same week as deciding what the app is for. Next.js is too heavy for the machine, and a hosted database is outside the course setup.

The known risk is real-time in week 10. Astro can stream server-sent events, which should be enough because updates only flow from the server to people watching. If that doesn't hold, I'll switch and write down why.

## How I worked with the agent

I made the product decisions; the agent proposed options, built them and tested them. The decisions that shaped the app were mine:

- rescoping the pitch to a small group;
- not splitting "right now" from "plan ahead": it doesn't matter when an invite is posted, only whether you're free;
- end times, picked in five-minute steps
  ([`42bff71`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/42bff71));
- letting people join late after class, as long as they arrive an hour before the end, with the organiser seeing who's coming late
  ([`cdff9e1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/cdff9e1));
- a light, Tiffany-blue look instead of the agent's first purple and dark design ([`492343b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/492343b)).

Some smaller decisions were the agent's, and I accepted them: a first name in a cookie instead of accounts, group size counting the host, the host not being able to leave, a 30-person cap, a 12-hour maximum, and dropdowns instead of the browser's time picker, because Safari and Firefox ignore a five-minute step.
The agent also kept buttons in a deeper teal because white on Tiffany blue itself is hard to read.

## Checking and correcting the work

The first claim I made a test for is "full means full" ([`88946dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/88946dd)):
six people race for the last two spots and exactly two get in. To check the test actually protects the claim, we removed the capacity rule on purpose; the test failed ("expected 2 but got 6"), and then we put the rule back.

The main correction came from the crit spec. Invites disappeared when they started, so someone who came back the next day found nothing they'd done. That fails "find their trace when they come back", so I added past plans ([`271d6ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/271d6ce)).

I tested by running the app locally in a normal and a private browser window, as two people, then on the live site. Each change was deployed and checked against the two shipped checks.

What's missing is the harness. `CLAUDE.md` is still empty, and only one of my README claims has a test. The next step is turning the others ("every invite has a what, where and when", "late joins stop an hour before the end") into rules and checks.

## What changed this week, and what's next

The biggest change was how long an invite stays open. It began closing at its start time
([`d1e9d16`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-wally0225/commit/d1e9d16)).
Once I thought about students finishing class 30 minutes late, I changed it to stay open until an hour before the end. That came from how students' days actually work, not from a feature list.

Next is crit 9: making it real-time, and deciding one thing about several people using it at once. I'll show "Someone is looking at an invite now" instead of seeing who is looking now, because showing viewers could bring back the awkwardness the app is trying to remove.
