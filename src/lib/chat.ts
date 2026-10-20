import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, deleteEndedChats } from "./db";
import { chatted } from "./live";
import { invites, joins, messages, people } from "./schema";

// A Vybe's chat: for the people going, while it's on. The rules are here and
// only here; the chat page and /api/chat both ask before showing or saving
// anything, every time, so someone who leaves loses it on their next request.

export const MAX_MESSAGE = 500;

export interface ChatMessage {
  id: number;
  personId: string;
  name: string;
  body: string;
  sentAt: Date;
}

export type ChatAccess = "open" | "not-going" | "over" | "gone";

// Whether this person can read and write in this invite's chat right now:
// they're going (the host always is), and it hasn't ended. A cancelled Vybe
// keeps its chat until it would have ended, so people can sort out another
// day; the people who joined it still are.
export function chatAccess(inviteId: number, personId: string, now: Date): ChatAccess {
  deleteEndedChats(now);
  const invite = db.select().from(invites).where(eq(invites.id, inviteId)).get();
  if (!invite) return "gone";
  if ((invite.endsAt ?? invite.startsAt) <= now) return "over";
  const going = db
    .select({ personId: joins.personId })
    .from(joins)
    .where(and(eq(joins.inviteId, inviteId), eq(joins.personId, personId)))
    .get();
  return going ? "open" : "not-going";
}

// Everything said so far, oldest first. Someone who joins late reads what
// was said before them; what someone wrote stays after they leave.
export function listMessages(inviteId: number): ChatMessage[] {
  return db
    .select({ id: messages.id, personId: messages.personId, name: people.name, body: messages.body, sentAt: messages.sentAt })
    .from(messages)
    .innerJoin(people, eq(messages.personId, people.id))
    .where(eq(messages.inviteId, inviteId))
    .orderBy(asc(messages.id))
    .all();
}

// How many messages each of these invites' chats holds, for the Chat button
// on the cards of the people going.
export function messageCounts(inviteIds: number[]): Map<number, number> {
  if (inviteIds.length === 0) return new Map();
  return new Map(
    db
      .select({ inviteId: messages.inviteId, n: sql<number>`count(*)` })
      .from(messages)
      .where(inArray(messages.inviteId, inviteIds))
      .groupBy(messages.inviteId)
      .all()
      .map((r) => [r.inviteId, r.n]),
  );
}

export type SendResult = ChatAccess | "sent";

export function sendMessage(inviteId: number, personId: string, body: string, now: Date): SendResult {
  const access = chatAccess(inviteId, personId, now);
  if (access !== "open") return access;
  db.insert(messages).values({ inviteId, personId, body, sentAt: now }).run();
  const going = db.select({ personId: joins.personId }).from(joins).where(eq(joins.inviteId, inviteId)).all();
  chatted(
    inviteId,
    going.map((g) => g.personId),
  );
  return "sent";
}
