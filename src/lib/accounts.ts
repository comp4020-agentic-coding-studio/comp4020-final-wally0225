import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, getPerson } from "./db";
import { type Person, people, sessions } from "./schema";

// Accounts: a username and a password. Passwords are never stored, only a
// salted scrypt hash; sessions are random tokens of which only the hash is
// stored.

export const MIN_PASSWORD = 8;

// "Ana", "ana.k", "ana_k-2": what people see, and what a log line can safely
// print.
const USERNAME = /^[A-Za-z0-9._-]{3,30}$/;
export const validUsername = (username: string) => USERNAME.test(username);

// at least 8 characters, an uppercase letter and a lowercase letter
export function passwordProblem(password: string): string | undefined {
  if (password.length < MIN_PASSWORD) return `at least ${MIN_PASSWORD} characters`;
  if (!/[A-Z]/.test(password)) return "an uppercase letter";
  if (!/[a-z]/.test(password)) return "a lowercase letter";
  return undefined;
}

function hash(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function matches(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  return timingSafeEqual(scryptSync(password, Buffer.from(salt, "hex"), expected.length), expected);
}

// Usernames are unique whatever the capitals: "Ana" and "ana" are one person.
const key = (username: string) => username.toLowerCase();

export function signUp(username: string, password: string): Person | "taken" {
  if (db.select().from(people).where(eq(people.username, key(username))).get()) return "taken";
  try {
    return db
      .insert(people)
      .values({ id: randomBytes(16).toString("hex"), name: username, username: key(username), passwordHash: hash(password) })
      .returning()
      .get();
  } catch {
    // two sign-ups for one name at the same moment: the unique index decides
    return "taken";
  }
}

// A hash to check against when there's no such username, so a login takes
// about as long either way and doesn't reveal which usernames exist.
const NOBODY = hash("Nobody-at-all-1");

export function logIn(username: string, password: string): Person | undefined {
  const row = db.select().from(people).where(eq(people.username, key(username))).get();
  const ok = matches(password, row?.passwordHash ?? NOBODY);
  return row && ok ? row : undefined;
}

// --- too many wrong passwords ---------------------------------------------
// Kept in memory, like the live state: Vybe runs on one machine.
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 10;
const failures = new Map<string, number[]>();

export function lockedOut(username: string, now = Date.now()): boolean {
  const recent = (failures.get(key(username)) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key(username), recent);
  return recent.length >= MAX_FAILURES;
}

export const failed = (username: string, now = Date.now()) =>
  failures.set(key(username), [...(failures.get(key(username)) ?? []), now]);

export const forgive = (username: string) => failures.delete(key(username));

// --- sessions -------------------------------------------------------------

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export function startSession(personId: string): string {
  const token = randomBytes(32).toString("hex");
  db.insert(sessions).values({ tokenHash: digest(token), personId }).run();
  return token;
}

export function endSession(token: string | undefined) {
  if (token) db.delete(sessions).where(eq(sessions.tokenHash, digest(token))).run();
}

export function personForSession(token: string | undefined): Person | undefined {
  if (!token) return undefined;
  const row = db.select().from(sessions).where(eq(sessions.tokenHash, digest(token))).get();
  return row ? getPerson(row.personId) : undefined;
}
