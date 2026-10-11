# 0001: Show how many others are looking at an invite, never who

Status: Accepted, 2026-10-11

## Context

Crit 9 made Vybe real-time: a post, join or leave shows on every open page within about a second. That also makes it possible to show who else is on the list right now, so I had to decide whether people see each other at all, and how much.

An invite with no sign of anyone around feels dead, and people wait to see if someone else goes first. Showing that others are looking can encourage people to join instead of waiting.

## Drivers

From the README's "What good means here":

- **Joining isn't awkward.** What you do on the list stays private. Until this decision the README said "nobody sees who looked and didn't join"; "who" there meant names, and the README now says so: a count of others looking, never who.
- **Find something to do with other people.** Anything that gets people to join sooner helps.
- **Trust it will happen as shown.** The going count is the promise; anything shown next to it shouldn't change what it means.

And my own rule for every choice: it has to be better for the user, it has to be something the app can actually do, and the logic has to hold up.

## Options considered

1. **No presence at all** (what Vybe had before). Nothing about anyone else's behaviour is shown, but the list gives no sign that anyone is around, so it does nothing to encourage joining.
2. **Named presence** ("Ana and Ben are looking"). The most social option, but it shows exactly who looked and didn't join, which breaks the README.
3. **An anonymous count of people with the card on screen** ("2 others looking").
4. **Count only real interest**, such as someone who opened the join dropdown. A narrower signal, but the number is smaller and shows up less often, so it encourages less.
5. **A sign without a number** ("Someone is looking"), which was my plan in week 9.

On who sees it, I also weighed showing it to joiners only, the host only, or everyone.

## Decision

Option 3, shown to everyone, the host included:

- A card at least half on screen, in a tab that isn't hidden, counts the person looking at it, even if they're scrolling past, because it's still on their screen.
- One person counts once, however many devices they have open.
- You never count yourself: the label says "1 other looking", "2 others looking".
- Zero isn't shown.
- Only the number leaves the server, never names or ids.

It beats no presence (1) because the point is to encourage people to join, and showing nothing doesn't. It beats named presence (2) because others' behaviour should stay private: a number shows interest without showing who. It beats counting only interest (4) for the same reason as counting scrollers: whatever is on someone's screen counts, so the number is there to encourage people. It beats "Someone is looking" (5) because a number is more realistic, and it can make people join sooner: if many people are considering it, they might be afraid the spots go if they don't join now.

The host sees it too. The going count is what the host needs to know who's coming; the looking count is a reference for "is my invite popular?", which might encourage hosts to post more.

## Consequences

- **The number doesn't mean "interested".** Someone scrolling past counts. I accept that: the count is there to encourage joining, not to predict who will.
- **When very few people are online, a count of 1 can be guessed.** The app still only ever shows the number, never who, and doesn't help anyone work it out.
- **It can feel like pressure.** "If I don't join now, someone else will" is part of why it works, but it sits close to the awkwardness the app is trying to remove.
- **The host sees how many looked and didn't join.** A "5 looking, 2 going" invite could discourage a host as well as encourage one.
- **Stale counts.** A phone that loses signal without closing the page can keep counting for up to about a minute, until the connection times out.
- **More for the app to do.** The server keeps every open page's cards in memory, and pages report what's on screen as people scroll. That works because Vybe runs on one machine; a second one would need a shared channel.

## How it's checked

`spec/viewer-count.test.ts`, against the running app: others see the count within about a second; you never count yourself; one person counts once across devices; the count drops when the card leaves the screen or the page closes; no event or page ever names who is looking; and nobody can report for someone else's page. It went red in `0f6156c` and green in `c2265e1`.
