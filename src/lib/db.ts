import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Invite, type Person, invites, joins, people } from "./schema";

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
  going: { id: string; name: string }[];
}

// Invites that haven't started yet, soonest first. One that has started is
// gone from the list: whether it's in 30 minutes or tomorrow, the only
// question is whether you're free.
export function listUpcoming(now: Date): InviteView[] {
  const rows = db
    .select({ invite: invites, host: people.name })
    .from(invites)
    .innerJoin(people, eq(invites.hostId, people.id))
    .where(gt(invites.startsAt, now))
    .orderBy(asc(invites.startsAt))
    .all();
  return withGoing(rows);
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
    .where(and(eq(joins.personId, personId), lte(invites.startsAt, now)))
    .orderBy(desc(invites.startsAt))
    .limit(PAST_LIMIT)
    .all();
  return withGoing(rows);
}

function withGoing(rows: { invite: Invite; host: string }[]): InviteView[] {
  if (rows.length === 0) return [];

  const going = db
    .select({ inviteId: joins.inviteId, id: people.id, name: people.name })
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
    going: going.filter((g) => g.inviteId === invite.id).map(({ id, name }) => ({ id, name })),
  }));
}

export function createInvite(values: {
  hostId: string;
  title: string;
  place: string;
  startsAt: Date;
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

export type JoinResult = "joined" | "already" | "full" | "gone";

// The count and the insert run in one transaction, and better-sqlite3 runs
// them synchronously on one connection, so two people taking the last spot at
// the same moment can't both get it.
export function joinInvite(inviteId: number, personId: string, now: Date): JoinResult {
  return db.transaction((tx) => {
    const invite = tx.select().from(invites).where(eq(invites.id, inviteId)).get();
    if (!invite || invite.startsAt <= now) return "gone";

    const going = tx.select({ personId: joins.personId }).from(joins).where(eq(joins.inviteId, inviteId)).all();
    if (going.some((g) => g.personId === personId)) return "already";
    if (going.length >= invite.size) return "full";

    tx.insert(joins).values({ inviteId, personId }).run();
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
