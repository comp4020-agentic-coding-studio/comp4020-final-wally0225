import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Invite, type Person, invites, joins, people } from "./schema";
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
}

// An invite is over once it ends. Invites from before end times existed are
// over once they start.
const notOver = (now: Date) => or(gt(invites.endsAt, now), and(isNull(invites.endsAt), gt(invites.startsAt, now)));
const over = (now: Date) => or(lte(invites.endsAt, now), and(isNull(invites.endsAt), lte(invites.startsAt, now)));

// Invites that haven't ended yet, soonest first: whether it's in 30 minutes,
// tomorrow, or already going, the only question is whether you're free.
export function listUpcoming(now: Date): InviteView[] {
  const rows = db
    .select({ invite: invites, host: people.name })
    .from(invites)
    .innerJoin(people, eq(invites.hostId, people.id))
    .where(notOver(now))
    .orderBy(asc(invites.startsAt))
    .all();
  return withGoing(rows);
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

  return rows.map(({ invite, host }) => ({
    ...invite,
    host,
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
}): Invite {
  return db.transaction((tx) => {
    const invite = tx.insert(invites).values(values).returning().get();
    tx.insert(joins).values({ inviteId: invite.id, personId: values.hostId }).run();
    return invite;
  });
}

// Biggest group an invite can ask for, the host included.
export const MAX_SIZE = 30;

// Longest an invite can run. An end time earlier than the start means the
// next day (11 pm to 1 am); the cap catches an end picked by mistake (a 5 pm
// start ending at 4 pm would otherwise run 23 hours).
export const MAX_HOURS = 12;

export type JoinResult = "joined" | "already" | "full" | "gone" | "arrival";

// arrivesAt is null for on time, or one of arrivalOptions' late steps. The
// count and the insert run in one transaction, and better-sqlite3 runs them
// synchronously on one connection, so two people taking the last spot at the
// same moment can't both get it.
export function joinInvite(inviteId: number, personId: string, now: Date, arrivesAt: Date | null): JoinResult {
  return db.transaction((tx) => {
    const invite = tx.select().from(invites).where(eq(invites.id, inviteId)).get();
    if (!invite) return "gone";

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
}

// The host can't leave their own invite; everyone else can.
export function leaveInvite(inviteId: number, personId: string) {
  const invite = db.select().from(invites).where(eq(invites.id, inviteId)).get();
  if (!invite || invite.hostId === personId) return;
  db.delete(joins)
    .where(and(eq(joins.inviteId, inviteId), eq(joins.personId, personId)))
    .run();
}
