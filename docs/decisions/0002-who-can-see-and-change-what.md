# 0002: Who can see and change what, decided on the server

Status: Accepted, 2026-10-20

## Context

Until crit 10 nearly everything in Vybe belonged to everyone: anyone could post, anyone could join anything with room, and nobody, not even the host, could change a Vybe once it was posted. Crit 10 added things that belong to some people and not others: a host calling off their Vybe, groups with owners and hosts, Vybes only a group's members can join, and a chat for the people going. Each one raises the same question: who is allowed to see this, and who is allowed to change it?

A person in Vybe is a first name and a random id in a cookie, set the first time they give their name. There are no accounts or passwords. Two Chrome profiles are two people.

## Drivers

From the README's "What good means here":

- **Trust it will happen as shown.** If someone other than the host could cancel a Vybe, or someone could post in a group they don't run, the list stops being something you can rely on.
- **Joining isn't awkward.** What you do on the list stays private. What people say in a Vybe's chat should only reach the people going.
- **Find something to do with other people.** Rules should keep things safe without getting in the way: anyone should still be able to start a group, join one, or join an open Vybe in one tap.

And my own rule for every choice: it has to be better for the user, it has to be something the app can actually do, and the logic has to hold up.

## Options considered

1. **Hide what people can't do, and trust the page.** The buttons only appear for the right people. Simple, but anyone who sends the form by hand gets around it, so it only looks safe.
2. **Check on the server, every request.** The server asks "who is this, and may they?" before it shows or saves anything. The page still only offers what's allowed, but the server is what decides.
3. **Real accounts with passwords.** Stronger proof of who someone is, but it adds sign-up friction to an app whose point is joining something in one tap, and my README already chose a first name over accounts.

For groups I also weighed invite-only groups against open ones, and showing a group's Vybes only to members against showing them to everyone.

## Decision

Option 2. Every rule below is checked on the server, in one place (`src/lib/db.ts`, `src/lib/groups.ts`, `src/lib/chat.ts`), and the page only offers what those rules allow.

**Vybes**

- Anyone with a name can post a Vybe and join one that has room, until joining closes.
- Only the host can cancel their Vybe. After it's cancelled, the people who joined still see it, marked cancelled, so nobody turns up anyway; it disappears for everyone else, and nobody new can join.
- Only the host can stop a weekly Vybe repeating.

**Groups**

- Anyone can start a group; they become its owner.
- Anyone can join a group, with no approval needed.
- Only the owner and hosts can post Vybes in the group, and only they can make a group Vybe repeat weekly.
- A host can make a member a host, like sharing access. Only the owner can take hosting away or remove someone, and nobody can change the owner's role.
- Only the owner can rename the group, change what it says about itself, or change its cover.
- A group's Vybes show to everyone, labelled with the group, but only members can join them. Someone who isn't a member is offered "Join group to join", and lands back on the Vybe.

**A Vybe's chat**

- Only the people going (the host included) can read it or write in it. This is checked on every read and every send, not just when the page opens, so someone who leaves loses it straight away; what they wrote stays for the others.
- Someone who joins late reads what was said before they joined.
- A cancelled Vybe keeps its chat until it would have ended, so the people who were going can sort out another day.
- When a Vybe ends, its messages are deleted from the database, not hidden.
- Live updates tell only the people going that there's a new message, and say which Vybe, never what was written.

**What I chose not to show**

- Who is looking at a Vybe ([0001](0001-viewer-count.md)): a count, never names.
- A calendar export only includes Vybes you joined.

It beats trusting the page (1) because a rule that only exists in the page isn't a rule; anyone can send the form directly. It beats accounts (3) because a name and a cookie are enough to tell people apart for a small group, and anything more would get in the way of joining in one tap.

Groups are open to join because the point of Vybe is meeting people you don't know yet; an approval step would make joining feel like asking permission, which is the awkwardness the app is trying to remove. Posting is restricted to hosts because a group's Vybes carry its name: if anyone could post in "ANU Pickleball", the label would stop meaning anything. Group Vybes show to everyone so people can discover groups through what they do, and joining the group first means the people at a group's regular game are actually its members.

The chat is only for the people going because it's there to help that one Vybe go well: saying hello to new friends, or "running 10 minutes late". It's deleted at the end because once the plan is over, there's no reason to keep what people said.

## Consequences

- **A cookie is the whole identity.** Clearing cookies or switching phones means starting again as a new person, and losing your hosting and group roles with it. Anyone who gets hold of someone's cookie can act as them. I accept that for an app at this size, with first names only and nothing valuable to steal.
- **Open groups can't keep anyone out.** Anyone can join any group and then join its Vybes. The owner can remove people, but can't stop them joining again.
- **Hosts can make other hosts, but only the owner can undo it.** A host who promotes the wrong person has to ask the owner.
- **An owner can't leave their own group.** A group always has its owner; handing ownership over isn't built yet.
- **Chat messages are gone for good** once the Vybe ends, and past plans can't show them. Messages from a Vybe that ended can stay on the volume for up to about five minutes, until the next sweep.
- **The rules live in three files.** Every API route has to ask them before acting; a new route that forgets would be a hole, which is why each rule also has a check in `spec/`.

## How it's checked

Against the running app, in `spec/`:

- `only-the-host-cancels.test.ts`: a joiner or a stranger can't cancel; after a cancel, joiners still see it, strangers don't, and nobody new can join.
- `groups.test.ts`: only hosts post in a group; a group's Vybe shows to everyone but only members can join it; a host can make a host and only the owner can take it back; only the owner changes the cover.
- `vybe-chat.test.ts`: only people going can read or write; someone who leaves is locked out but their messages stay; late joiners see earlier messages; a cancelled Vybe's chat stays open; live updates reach only the people going and never carry the text.
- `calendar-export.test.ts`: you can't export a Vybe you haven't joined.

Deleting a chat when its Vybe ends can't be checked against the running app without waiting for one to end, so it was checked directly against a throwaway database: at the end time that Vybe's messages were deleted, another Vybe's stayed, and the ended chat refused reads and sends.

## Logged

Every one of these actions is logged on the server with who did it, as `Name(first 8 characters of their id)`, so two people with the same name can be told apart in `flyctl logs`. Refusals are logged with why (`result="not-owner"`, `reason: "not-group-host"`), so a refused attempt never reads as a success. Chat lines say who wrote in which Vybe's chat and how long the message was, never what it said.
