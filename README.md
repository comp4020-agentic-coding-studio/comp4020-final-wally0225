# Vybe

Vybe is for ANU students who want to do something but can't find anyone to do it with. I want to play pickleball, but none of my friends have free time that lines up with mine. On Vybe I post what I want to do, where and when, and anyone who's free can join until it's full. Maybe some of them become your future friends.

## Why not the group chat

Why not just ask in a big group chat? Because it fails in four ways:

- **Asking is awkward** in front of two hundred people, so most people don't.
- **The message gets buried** within minutes.
- **Nobody can see who's in**, because replies are scattered.
- **People forget when and where**, because the details scrolled away.

On Vybe an invite is something you post, not a question you ask in public. It stays on the list, shows who's going, and always has a what, where and when.

## What good means here

Good means a student can find something to do with other people, today or later this week, and trust it will happen as shown:

- **Full means full**, even if two people press Join at the same moment.
  *Checked* in `spec/full-means-full.test.ts`.
- **Every invite says what, where and when.** Enforced by the app; a check in `spec/` is next.
- **When you post doesn't matter.** In 30 minutes or tomorrow, if you're free, join. One list, soonest first.
- **Late is fine, within reason.** Classes run over, so you can join something already going if you'll arrive an hour before it ends; everyone sees "from 5:30 pm" by your name. Enforced by the app.
- **Dead plans disappear, but your trace doesn't.** Invites nobody can make leave the list; people who went keep them in past plans. Enforced by the app.
- **Joining isn't awkward.** Nobody sees who looked and didn't join, and there's no public "no".
- **It can lead to friends.** Past plans show who you went with, so you can find the same people again.

## What I read

Clay Shirky's "Situated Software" (2004) argues for software built for one group in one context. That's why Vybe is for ANU students, not a city.

Robin Sloan's "An app can be a home-cooked meal" (2020) is about an app made for his family and nobody else. I don't go that small, because the point is meeting people you don't know yet, but I took his idea that an app doesn't have to grow to be worth making.

Ray Oldenburg's *The Great Good Place* (1989) describes "third places" where people meet outside home and work. Vybe tries to do their job: getting people into the same room.

## What I chose not to build

Vybe started as my group's pitch, with profiles, AI matching, reputation scores, ID checks, a premium tier and venue partnerships. They were there to grow a platform. For a small group they make things worse: scoring the people you play pickleball with isn't low pressure, and matching isn't needed when you can read the whole list.

There's also no chat. The group chat is what Vybe replaces, so the plan is in the invite and the talking happens when you meet. There are no accounts either, just a first name. Right now anyone with the link can join; who counts as a member is a decision I haven't made yet.
