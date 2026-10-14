import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { announce } from "./live";
import { type Invite, type Person, groups, invites, joins, members, people } from "./schema";
import { STEP_MINUTES, nextStep } from "./time";

// One SQLite file is the app's whole persistent state. In production the
// Dockerfile points DATABASE_PATH at the volume (/data), which is how state
// survives a restart and a redeploy; locally it defaults to an untracked file
// in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");
client.pragma("foreign_keys = ON");

export const db = drizzle(client);

// Migrations run at boot, on the machine that holds the volume. The flow:
// edit src/lib/schema.ts, `pnpm db:generate`, commit what it writes to
// drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Invite, Person };

export function getPerson(id: string | undefined): Person | undefined {
  if (!id) return undefined;
  return db.select().from(people).where(eq(people.id, id)).get();
}

export function createPerson(name: string): Person {
  return db.insert(people).values({ id: randomUUID(), name }).returning().get();
}

export interface InviteView extends Invite {
  host: string;
  going: { id: string; name: string; arrivesAt: Date | null }[];
  // the group it was posted in, for its label
  group: string | null;
}

// An invite is over once it ends. Invites from before end times existed are
// over once they start.
const notOver = (now: Date) => or(gt(invites.endsAt, now), and(isNull(invites.endsAt), gt(invites.startsAt, now)));
const over = (now: Date) => or(lte(invites.endsAt, now), and(isNull(invites.endsAt), lte(invites.startsAt, now)));

// Invites that haven't ended yet, soonest first: whether it's in 30 minutes,
// tomorrow, or already going, the only question is whether you're free.
// A cancelled one is only for the people who joined it, so they know not to
// turn up; everyone else never sees it again.
export function listUpcoming(now: Date, personId: string): InviteView[] {
  rollRepeats(now);
  const rows = db
    .select({ invite: invites, host: people.name })
    .from(invites)
    .innerJoin(people, eq(invites.hostId, people.id))
    .where(notOver(now))
    .orderBy(asc(invites.startsAt))
    .all();
  return withGoing(rows).filter((i) => !i.cancelledAt || i.going.some((g) => g.id === personId));
}

// Someone can join late, as long as they'll get there at least this long
// before it ends: turning up for the last ten minutes isn't joining.
export const LATE_CUTOFF_MINUTES = 60;

// When someone joining now could get there: on time, if it hasn't started,
// or any five-minute step after the start up to the cutoff. Invites from
// before end times existed only take on-time joins.
export function arrivalOptions(invite: Invite, now: Date): { onTime: boolean; late: Date[] } {
  const onTime = now < invite.startsAt;
  const late: Date[] = [];
  if (invite.endsAt) {
    const step = STEP_MINUTES * 60_000;
    const last = invite.endsAt.getTime() - LATE_CUTOFF_MINUTES * 60_000;
    const first = Math.max(invite.startsAt.getTime() + step, nextStep(now).getTime());
    for (let t = first; t <= last; t += step) late.push(new Date(t));
  }
  return { onTime, late };
}

export function canJoin(invite: Invite, now: Date): boolean {
  if (invite.cancelledAt) return false;
  const options = arrivalOptions(invite, now);
  return options.onTime || options.late.length > 0;
}

// How many past plans someone sees; enough to find the same people again.
export const PAST_LIMIT = 20;

// What someone went to, most recent first, with who else was there. Only
// their own: nobody else can see what you've been to.
export function listPast(personId: string, now: Date): InviteView[] {
  const rows = db
    .select({ invite: invites, host: people.name })
    .from(joins)
    .innerJoin(invites, eq(joins.inviteId, invites.id))
    .innerJoin(people, eq(invites.hostId, people.id))
    .where(and(eq(joins.personId, personId), over(now)))
    .orderBy(desc(invites.startsAt))
    .limit(PAST_LIMIT)
    .all();
  return withGoing(rows);
}

function withGoing(rows: { invite: Invite; host: string }[]): InviteView[] {
  if (rows.length === 0) return [];

  const going = db
    .select({ inviteId: joins.inviteId, id: people.id, name: people.name, arrivesAt: joins.arrivesAt })
    .from(joins)
    .innerJoin(people, eq(joins.personId, people.id))
    .where(
      inArray(
        joins.inviteId,
        rows.map((r) => r.invite.id),
      ),
    )
    .orderBy(asc(joins.joinedAt))
    .all();

  const names = new Map(
    db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .all()
      .map((g) => [g.id, g.name]),
  );

  return rows.map(({ invite, host }) => ({
    ...invite,
    host,
    group: invite.groupId === null ? null : (names.get(invite.groupId) ?? null),
    // the host first, then everyone else in the order they joined
    going: going
      .filter((g) => g.inviteId === invite.id)
      .sort((a, b) => Number(b.id === invite.hostId) - Number(a.id === invite.hostId))
      .map(({ id, name, arrivesAt }) => ({ id, name, arrivesAt })),
  }));
}

export function createInvite(values: {
  hostId: string;
  title: string;
  place: string;
  startsAt: Date;
  endsAt: Date;
  size: number;
  lat: number;
  lng: number;
  groupId?: number | null;
  repeat?: "once" | "weekly";
}): Invite {
  const created = db.transaction((tx) => {
    const invite = tx.insert(invites).values(values).returning().get();
    tx.insert(joins).values({ inviteId: invite.id, personId: values.hostId }).run();
    return invite;
  });
  announce(created.id);
  return created;
}

// Biggest group an invite can ask for, the host included.
export const MAX_SIZE = 30;

// Longest an invite can run. An end time earlier than the start means the
// next day (11 pm to 1 am); the cap catches an end picked by mistake (a 5 pm
// start ending at 4 pm would otherwise run 23 hours).
export const MAX_HOURS = 12;

export type JoinResult = "joined" | "already" | "full" | "gone" | "arrival" | "members";

// arrivesAt is null for on time, or one of arrivalOptions' late steps. The
// count and the insert run in one transaction, and better-sqlite3 runs them
// synchronously on one connection, so two people taking the last spot at the
// same moment can't both get it.
export function joinInvite(inviteId: number, personId: string, now: Date, arrivesAt: Date | null): JoinResult {
  const result = db.transaction((tx): JoinResult => {
    const invite = tx.select().from(invites).where(eq(invites.id, inviteId)).get();
    if (!invite || invite.cancelledAt) return "gone";

    // a group's Vybes are for its members; anyone can see them, and anyone
    // can join the group first
    if (invite.groupId !== null) {
      const member = tx
        .select()
        .from(members)
        .where(and(eq(members.groupId, invite.groupId), eq(members.personId, personId)))
        .get();
      if (!member) return "members";
    }

    // a step of grace, for a page opened a few minutes before joining
    const options = arrivalOptions(invite, new Date(now.getTime() - STEP_MINUTES * 60_000));
    if (!options.onTime && options.late.length === 0) return "gone";
    const fits =
      arrivesAt === null ? options.onTime : options.late.some((t) => t.getTime() === arrivesAt.getTime());
    if (!fits) return "arrival";

    const going = tx.select({ personId: joins.personId }).from(joins).where(eq(joins.inviteId, inviteId)).all();
    if (going.some((g) => g.personId === personId)) return "already";
    if (going.length >= invite.size) return "full";

    tx.insert(joins).values({ inviteId, personId, arrivesAt }).run();
    return "joined";
  });
  // announced once the transaction has committed, so a page that refetches
  // straight away sees the join
  if (result === "joined") announce(inviteId);
  return result;
}

const WEEK_MS = 7 * 86_400_000;

// A group's regular Vybe posts next week's when this week's ends, at the same
// time and place, with only its host going. Run when the list is read, so it
// needs no timer. A cancelled week still rolls on: calling off one Wednesday
// isn't calling off every Wednesday. The host stays on as long as they can
// still host in that group; if they can't, the series stops.
export function rollRepeats(now: Date) {
  const due = db
    .select()
    .from(invites)
    .where(and(eq(invites.repeat, "weekly"), over(now)))
    .all();
  for (const invite of due) {
    db.transaction((tx) => {
      // claim it first, so two requests at once can't both roll it
      const claimed = tx
        .update(invites)
        .set({ repeat: "once" })
        .where(and(eq(invites.id, invite.id), eq(invites.repeat, "weekly")))
        .run();
      if (claimed.changes === 0 || invite.groupId === null) return;
      const role = tx
        .select({ role: members.role })
        .from(members)
        .where(and(eq(members.groupId, invite.groupId), eq(members.personId, invite.hostId)))
        .get()?.role;
      if (role !== "owner" && role !== "host") return;

      // the next week that hasn't ended yet, in case nobody looked for a while
      let startsAt = invite.startsAt.getTime() + WEEK_MS;
      const length = (invite.endsAt ?? invite.startsAt).getTime() - invite.startsAt.getTime();
      while (startsAt + length <= now.getTime()) startsAt += WEEK_MS;

      const next = tx
        .insert(invites)
        .values({
          hostId: invite.hostId,
          title: invite.title,
          place: invite.place,
          startsAt: new Date(startsAt),
          endsAt: invite.endsAt ? new Date(startsAt + length) : null,
          size: invite.size,
          lat: invite.lat,
          lng: invite.lng,
          groupId: invite.groupId,
          repeat: "weekly",
        })
        .returning()
        .get();
      tx.insert(joins).values({ inviteId: next.id, personId: invite.hostId }).run();
      console.log(`[vybe] repeat posted invite=${next.id} from=${invite.id} group=${invite.groupId}`);
    });
  }
}

// The host can stop a regular Vybe repeating, keeping this week's.
export function stopRepeat(inviteId: number, personId: string): "stopped" | "not-host" | "gone" {
  const invite = db.select().from(invites).where(eq(invites.id, inviteId)).get();
  if (!invite || invite.repeat !== "weekly") return "gone";
  if (invite.hostId !== personId) return "not-host";
  db.update(invites).set({ repeat: "once" }).where(eq(invites.id, inviteId)).run();
  announce(inviteId);
  return "stopped";
}

export type CancelResult = "cancelled" | "not-host" | "gone";

// Only the host can call an invite off, and only before it ends. Checked
// here, on the server, whatever the page shows.
export function cancelInvite(inviteId: number, personId: string, now: Date): CancelResult {
  const invite = db.select().from(invites).where(eq(invites.id, inviteId)).get();
  if (!invite) return "gone";
  if (invite.hostId !== personId) return "not-host";
  const ended = invite.endsAt ? invite.endsAt <= now : invite.startsAt <= now;
  if (invite.cancelledAt || ended) return "gone";
  db.update(invites).set({ cancelledAt: now }).where(eq(invites.id, inviteId)).run();
  announce(inviteId);
  return "cancelled";
}

// The host can't leave their own invite; everyone else can.
export function leaveInvite(inviteId: number, personId: string) {
  const invite = db.select().from(invites).where(eq(invites.id, inviteId)).get();
  if (!invite || invite.hostId === personId || invite.cancelledAt) return;
  const left = db
    .delete(joins)
    .where(and(eq(joins.inviteId, inviteId), eq(joins.personId, personId)))
    .run();
  if (left.changes > 0) announce(inviteId);
}
