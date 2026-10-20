# Vybe

Vybe is for ANU students who want to do something but can't find anyone to do it with. I want to play pickleball, but none of my friends have free time that lines up with mine. On Vybe I post what I want to do, where and when, and anyone who's free can join until it's full. Maybe some of them become your future friends.

## Why not the group chat

Why not just ask in a big group chat? Because it fails in four ways:

- **Asking is awkward** in front of two hundred people, so most people don't.
- **The message gets buried** within minutes.
- **Nobody can see who's in**, because replies are scattered.
- **People forget when and where**, because the details scrolled away.

A Vybe is something you post, not a question you ask in public. It stays on the list, shows who's going, and always has a what, where and when.

## What good means here

Good means a student can find something to do with other people, today or later this week, and trust it will happen as shown:

- **Full means full**, even if two people press Join at the same moment.
  *Checked* in `spec/full-means-full.test.ts`.
- **Every Vybe says what, where and when.** Enforced by the app; a check in `spec/` is next.
- **When you post doesn't matter.** In 30 minutes or tomorrow, if you're free, join. One list, soonest first, or nearest first if you choose.
- **Late is fine, within reason.** Classes run over, so you can join something already going if you'll arrive an hour before it ends; everyone sees "from 5:30 pm" by your name. Enforced by the app.
- **Dead plans disappear, but your trace doesn't.** Vybes nobody can make leave the list; people who went keep them in past plans. Enforced by the app.
- **Joining isn't awkward.** What you do on the list stays private. A Vybe shows how many others are looking, to encourage people to join, but never who, and there's no public "no".
  *Checked* in `spec/viewer-count.test.ts`.
- **Close enough to just go.** Open the map and see what's on near you, starting a short walk away (about 1 km), and zoom out for more. Where you are stays on your phone.
  *Checked* in `spec/every-invite-has-a-spot.test.ts`.
- **It can lead to friends.** Past plans show who you went with, so you can find the same people again.

## What I read

Clay Shirky's "Situated Software" (2004) argues for software built for one group in one context. That's why Vybe is for ANU students, not a city.

Robin Sloan's "An app can be a home-cooked meal" (2020) is about an app made for his family and nobody else. I don't go that small, because the point is meeting people you don't know yet, but I took his idea that an app doesn't have to grow to be worth making.

Ray Oldenburg's *The Great Good Place* (1989) describes "third places" where people meet outside home and work. Vybe tries to do their job: getting people into the same room.

## What I chose not to build

Vybe started as my group's pitch, with profiles, AI matching, reputation scores, ID checks, a premium tier and venue partnerships. They were there to grow a platform. For a small group they make things worse: scoring the people you play pickleball with isn't low pressure, and matching isn't needed when you can read the whole list.

Each Vybe has a chat, but it isn't the big group chat that mixes everything together and buries the details. It only exists while the Vybe is on, only the people who joined can read it, and it's deleted when the Vybe ends. It's there to help the Vybe go well: say hello to your new friends, or sort out a problem before it starts.

There are no accounts either, just a first name. Anyone can post or join a Vybe, start a group or join one. Only the host can cancel their Vybe, only a group's hosts post in it, and only its members join its Vybes. The server checks every rule ([docs/decisions/0002](docs/decisions/0002-who-can-see-and-change-what.md)).
