import { sql } from "drizzle-orm";
import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both --- the migration applies when the server boots (see
// src/lib/db.ts). Never edit the deployed database by hand: state on the
// volume outlives every deploy, and the migration trail keeps old state and
// new code compatible.

// Someone the app can tell apart from everyone else: a random id kept in a
// cookie, and the first name they gave. No account, no password.
export const people = sqliteTable("people", {
  id: text().primaryKey(),
  name: text().notNull(),
  createdAt: int("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// "Pickleball at the ANU Sport courts, Wed 5pm, 4 of us." size counts the
// host, who is the first to join.
export const invites = sqliteTable("invites", {
  id: int().primaryKey({ autoIncrement: true }),
  hostId: text("host_id")
    .notNull()
    .references(() => people.id),
  title: text().notNull(),
  place: text().notNull(),
  startsAt: int("starts_at", { mode: "timestamp_ms" }).notNull(),
  // every new invite has one; null only on invites posted before end times
  // existed, which the volume still holds
  endsAt: int("ends_at", { mode: "timestamp_ms" }),
  size: int().notNull(),
  createdAt: int("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Who's going. One row per person per invite; the host has one too.
export const joins = sqliteTable(
  "joins",
  {
    inviteId: int("invite_id")
      .notNull()
      .references(() => invites.id),
    personId: text("person_id")
      .notNull()
      .references(() => people.id),
    joinedAt: int("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [primaryKey({ columns: [table.inviteId, table.personId] })],
);

export type Person = typeof people.$inferSelect;
export type Invite = typeof invites.$inferSelect;
