# Vybe

Vybe is a real-time app for people who want to do something but can't find anyone to do it with. I want to play pickleball, but none of my friends are free then. On Vybe I post what, where and when, and anyone free can join until it's full. Some may become friends.

## Why not the group chat

Why not a big group chat? It fails four ways:

- **Asking is awkward** in front of two hundred people.
- **The message gets buried** within minutes.
- **Nobody can see who's in**; replies are scattered.
- **People forget when and where**; the details scrolled away.

A Vybe is posted, not asked in public. It stays on the list, with a what, where and when.

## What good means here

Good means a student can find something to do with other people and trust it will happen as shown. Each line is *checked* in `spec/` or *judged*.

- **Full means full**, even if two people press Join at the same moment.
  *Checked* in `spec/full-means-full.test.ts`.
- **Every Vybe says what, where and when.** *Checked* in `spec/what-where-when.test.ts`.
- **Changes show live.** A post, join or edit reaches everyone's page within about a second. *Checked*: `spec/live-updates.test.ts`.
- **When you post doesn't matter.** In 30 minutes or tomorrow, if you're free, join: one list, soonest or nearest first. *Judged*.
- **Late is fine, within reason.** Classes run over, so join something already going if you'll arrive an hour before it ends; others see "from 5:30 pm" by your name. *Checked*: `spec/late-is-fine.test.ts`.
- **The host can change a Vybe until it starts.** It can't shrink below who's going. *Checked*: `spec/edit-before-start.test.ts`.
- **Joining isn't awkward.** What you do on the list stays private. A Vybe shows how many others are looking, never who, and there's no public "no". *Checked*: `spec/viewer-count.test.ts`.
- **Close enough to just go.** Open the map and see what's on near you, starting a short walk away, and zoom out for more. Where you are stays on your phone. Every Vybe having a spot is *checked*: `spec/every-invite-has-a-spot.test.ts`; the distance is *judged*.
- **You sign in as yourself.** A username and password (8+ characters, upper and lower case), so you can log in from another phone and no two people share a name. *Checked*: `spec/accounts.test.ts`.
- **It can lead to friends.** Past plans show who you went with, so you can find the same people again. Ended Vybes leave the list but stay in past plans (*checked* locally: `spec/dead-plans-disappear.test.ts`); the friends are *judged*.

## What I read

Robin Sloan's "An app can be a home-cooked meal" (2020) is about an app made for his family. I took from it that an app needn't grow to be worth making.

Ray Oldenburg's *The Great Good Place* (1989) describes "third places" where people meet outside home and work. Vybe tries to get people into the same room.

## What I chose not to build

Vybe started as my group's pitch, with profiles, AI recommendation, reputation scores, a premium tier and venue partnerships, all to grow a platform. Vybe is for ANU students and just makes doing things easier.

Each Vybe has a chat, but not the big one that buries the details. Only the people going can read it, and it's deleted when the Vybe ends. It's for saying hello or sorting out a problem. *Checked*: `spec/vybe-chat.test.ts`.

Anyone can post or join Vybes, or start or join a group. Only the host cancels their Vybe, only a group's hosts post in it, and only its members join its Vybes. The server checks every rule ([docs/decisions/0002](docs/decisions/0002-who-can-see-and-change-what.md)).
