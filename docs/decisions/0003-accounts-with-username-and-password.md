# 0003: Everyone signs up and logs in with a username and a password

Status: Accepted, 2026-11-01. Reverses the identity part of [0002](0002-who-can-see-and-change-what.md).

## Context

0002 said a person in Vybe is a first name and a random id in a cookie, and rejected real accounts because sign-up would add friction to an app whose point is joining something in one tap. That held for crit 10. Afterwards I wanted people to come back as themselves: log in from another phone, and have their own information that I can build on later.

## Drivers

- **Come back as yourself.** A cookie is lost when you clear it or change phone, and with it your plans and your group roles.
- **No two people with the same name.** First names could repeat; a username can't.
- **Room to grow.** With an account it's easier to manage user information, so I can add features for users later, such as their preferred kinds of Vybe, to make Vybe more personal.
- My rule for every choice: better for the user, something the app can actually do, logic that holds up.

## Options considered

1. **Keep first name and cookie** (0002's choice). No sign-up step, but identity is only as lasting as the cookie.
2. **Username and password.** What I asked for. Passwords need at least 8 characters, an uppercase letter and a lowercase letter.
3. **Email or ANU login.** Stronger proof of who someone is, but it needs email sending or an ANU integration the app doesn't have, and a username is enough for what I want now.

## Decision

Option 2. Everyone signs up with a username and password before they can use Vybe, then logs in with them. Signed-out visitors see only the front page and the README.

Choices made while building, named so they can be accepted or changed:

- Usernames are 3 to 30 letters, digits, dots, dashes or underscores, and are unique whatever the capitals.
- Passwords are stored only as salted scrypt hashes. The cookie holds a random session token, and only its hash is kept in the database, so a copy of the database can't be used to act as anyone.
- Logging out deletes the session on the server, so a copied cookie stops working.
- A wrong username and a wrong password get the same answer, and after 10 wrong passwords for one username in 15 minutes login is refused for a while. That count is kept in memory, so a restart clears it.
- Logs show the username and the start of the id, never a password.

## Consequences

- **Sign-up is a step before joining.** This is the cost 0002 named, and I now accept it.
- **People who arrived before accounts can't log in.** They have no password, so their old plans and groups stay in the data but nobody can sign in as them. Everyone starts again.
- **Everyone was logged out on deploy,** because the cookie changed from `person` to `session`.
- **There is no password reset.** Without email there is nothing to send a reset to, so a forgotten password means a new account.
- **Passwords are the user's to protect.** The rules ask for length and mixed case, not for checking against lists of known leaked passwords.
- **The lockout is per username and in memory,** so it limits guessing at one account, not an attacker trying many usernames, and it assumes Vybe stays on one machine.

## How it's checked

`spec/accounts.test.ts`, against the running app: the password rules, the username rules, unique usernames whatever the capitals, login with the right details and none other, the same answer for a wrong username and a wrong password, signed-out visitors kept out of everything but the front page and the README, no entry with just a first name, logout ending the session on the server, and one person's session not being another's.

The lockout is checked there too: after too many wrong passwords even the right one is refused, whatever the capitals, and one account's lockout doesn't lock anyone else out. It doesn't check how long the lockout lasts, which would mean waiting 15 minutes. The hashing isn't checked, since a check against the running app can't see the database; it can only be read in `src/lib/accounts.ts`.
