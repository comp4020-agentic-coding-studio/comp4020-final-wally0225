import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { type Group, type Role, groups, members, people } from "./schema";
import { TAGS, type Tag, isTag } from "./tags";

// Groups and who can do what in them. Every rule here is the server's: the
// page only offers what these allow, and the API asks these before acting.

export type { Group, Role };

export const MAX_GROUP_NAME = 50;
export const MAX_GROUP_ABOUT = 200;

export interface GroupView extends Group {
  memberCount: number;
  // this person's role, if they're in it
  role: Role | undefined;
}

export function roleIn(groupId: number, personId: string): Role | undefined {
  return db
    .select({ role: members.role })
    .from(members)
    .where(and(eq(members.groupId, groupId), eq(members.personId, personId)))
    .get()?.role;
}

export const canHost = (role: Role | undefined) => role === "owner" || role === "host";

export function getGroup(groupId: number, personId: string): GroupView | undefined {
  const group = db.select().from(groups).where(eq(groups.id, groupId)).get();
  if (!group) return undefined;
  return { ...group, memberCount: countMembers(groupId), role: roleIn(groupId, personId) };
}

function countMembers(groupId: number): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(members)
      .where(eq(members.groupId, groupId))
      .get()?.n ?? 0
  );
}

// Every group, the ones you're in first, then the biggest.
export function listGroups(personId: string): GroupView[] {
  const all = db.select().from(groups).all();
  return all
    .map((g) => ({ ...g, memberCount: countMembers(g.id), role: roleIn(g.id, personId) }))
    .sort((a, b) => Number(!!b.role) - Number(!!a.role) || b.memberCount - a.memberCount || a.name.localeCompare(b.name));
}

// The groups this person can post in, for the post form.
export function hostingGroups(personId: string): Group[] {
  return db
    .select({ group: groups })
    .from(members)
    .innerJoin(groups, eq(members.groupId, groups.id))
    .where(and(eq(members.personId, personId), sql`${members.role} in ('owner', 'host')`))
    .orderBy(asc(groups.name))
    .all()
    .map((r) => r.group);
}

export function listMembers(groupId: number): { id: string; name: string; role: Role }[] {
  const order = { owner: 0, host: 1, member: 2 } as const;
  return db
    .select({ id: people.id, name: people.name, role: members.role, joinedAt: members.joinedAt })
    .from(members)
    .innerJoin(people, eq(members.personId, people.id))
    .where(eq(members.groupId, groupId))
    .all()
    .sort((a, b) => order[a.role] - order[b.role] || a.joinedAt.getTime() - b.joinedAt.getTime())
    .map(({ id, name, role }) => ({ id, name, role }));
}

// Names of the groups some Vybes were posted in, for their labels.
export function groupNames(): Map<number, string> {
  return new Map(
    db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .all()
      .map((g) => [g.id, g.name]),
  );
}

// Anyone can start a group; they own it.
export function createGroup(ownerId: string, name: string, about: string): Group {
  return db.transaction((tx) => {
    const group = tx.insert(groups).values({ name, about, ownerId }).returning().get();
    tx.insert(members).values({ groupId: group.id, personId: ownerId, role: "owner" }).run();
    return group;
  });
}

// Anyone can join a group; nobody needs letting in.
export function joinGroup(groupId: number, personId: string): "joined" | "already" | "gone" {
  if (!db.select().from(groups).where(eq(groups.id, groupId)).get()) return "gone";
  if (roleIn(groupId, personId)) return "already";
  db.insert(members).values({ groupId, personId, role: "member" }).run();
  return "joined";
}

// Anyone but the owner can leave. A group always has its owner.
export function leaveGroup(groupId: number, personId: string): "left" | "owner" | "not-member" {
  const role = roleIn(groupId, personId);
  if (!role) return "not-member";
  if (role === "owner") return "owner";
  db.delete(members)
    .where(and(eq(members.groupId, groupId), eq(members.personId, personId)))
    .run();
  return "left";
}

export type RoleResult = "changed" | "not-host" | "not-owner" | "not-member" | "owner";

// A host (or the owner) can make a member a host. Only the owner can take
// hosting back. Nobody can change the owner's role.
export function setRole(groupId: number, actorId: string, personId: string, role: "host" | "member"): RoleResult {
  const actor = roleIn(groupId, actorId);
  const current = roleIn(groupId, personId);
  if (!current) return "not-member";
  if (current === "owner") return "owner";
  if (role === "host" && !canHost(actor)) return "not-host";
  if (role === "member" && actor !== "owner") return "not-owner";
  db.update(members)
    .set({ role })
    .where(and(eq(members.groupId, groupId), eq(members.personId, personId)))
    .run();
  return "changed";
}

// Only the owner removes people, and never themselves.
export function removeMember(groupId: number, actorId: string, personId: string): RoleResult | "removed" {
  if (roleIn(groupId, actorId) !== "owner") return "not-owner";
  const current = roleIn(groupId, personId);
  if (!current) return "not-member";
  if (current === "owner") return "owner";
  db.delete(members)
    .where(and(eq(members.groupId, groupId), eq(members.personId, personId)))
    .run();
  return "removed";
}

// The owner can rename the group, change what it says about itself and pick
// its cover.
export function updateGroup(
  groupId: number,
  actorId: string,
  name: string,
  about: string,
  cover: Cover | null,
): "updated" | "not-owner" {
  if (roleIn(groupId, actorId) !== "owner") return "not-owner";
  db.update(groups).set({ name, about, cover }).where(eq(groups.id, groupId)).run();
  return "updated";
}

// The pictures a group can wear, one per kind of Vybe (src/lib/tags.ts),
// drawn for Vybe and served from public/covers: nothing hotlinked, nothing
// uploaded, so nobody's photo ends up somewhere they didn't put it.
export const COVERS = Object.keys(TAGS) as Cover[];
export type Cover = Tag;
export const isCover = isTag;

// The owner's pick, or until they make one, a cover chosen from the name
// the same way its colour is, so a new group already has a picture.
export function coverOf(group: { name: string; cover: string | null }): Cover {
  if (group.cover && isCover(group.cover)) return group.cover;
  return COVERS[nameHash(group.name) % COVERS.length];
}

export const coverUrl = (cover: Cover) => `/covers/${cover}.svg`;

function nameHash(name: string): number {
  let hash = 2166136261;
  for (const ch of name) hash = Math.imul(hash ^ ch.codePointAt(0)!, 16777619) >>> 0;
  return hash;
}

// Each group's own colour, from its name, so groups are easy to tell apart
// at a glance: a hue for the cover, the mark and the accents.
export function groupHue(name: string): number {
  // FNV-1a picks one of twelve well-spaced hues, so two groups rarely look
  // alike and no group lands on a muddy in-between colour
  const palette = [8, 28, 45, 95, 140, 205, 220, 245, 265, 285, 315, 340];
  const h = palette[nameHash(name) % palette.length];
  // skip the band nearest the app's teal, so a group never looks like a Vybe
  return h >= 160 && h < 190 ? (h + 60) % 360 : h;
}
