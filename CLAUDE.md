# Vybe: rules for the agent

Vybe is a small app for ANU students to post something to do (a Vybe: what,
where, when, how many) and join other people's. `README.md` says what good
means here; these are the rules I hold you to while building it.

## How I decide

- Every choice has to pass three tests: it's better for the user, the app can
  actually do it, and the logic holds up. If an option fails one, say which.
- `README.md`'s "What good means here" is the measure. A new behaviour gets its
  README line first, then a check if it can have one, then code. If something
  you're about to build doesn't trace to a README line, stop and ask.
- When there's a decision for me, explain the options and what each costs
  before asking me to pick. Don't hand me a list of labels to choose from.
- The decisions are mine; propose, don't decide. Small technical choices you
  make, name them so I can accept or change them.

## What the app must never do

- Show who looked at a Vybe. Counts are fine ("2 others looking"); names, ids
  or anything that singles a person out are not.
- Send anyone's location to the server. Distances, the Nearest sort and the
  map's starting view are worked out on the phone.
- Let more people join than a Vybe has room for. The server decides; the page
  only shows what the server said.

## Building

- Write the check before the code, in `spec/`, and commit it red. The commit
  that turns it green is the evidence.
- Assert what the app does, not how it's built, so checks survive a change of
  approach.
- The checks only see the server. Anything the page does on screen (live
  swaps, the map, layout) is checked in a real browser at phone and laptop
  widths before you call it done. Show me what you saw.
- One behaviour per commit, with a message that says what changed for the
  user.
- The server is the one place that decides what a card shows. Live updates
  refetch rendered HTML rather than rebuilding cards in the browser.
- Live state is kept in memory because Vybe runs on one Fly machine. Don't add
  a second machine without a shared channel between them.
- Call them Vybes in anything people see. Code names (`invites`, `InviteCard`,
  `/api/invites`) stay as they are.

## Data and deploys

- Every push to `main` deploys to the live site. Ask before pushing to `main`,
  and build bigger features on a branch.
- Never change the live database by hand. Schema changes go through
  `src/lib/schema.ts` and `pnpm db:generate`.
- `pnpm check` posts "Spec check" Vybes into whatever app it runs against. Run
  it against a throwaway database, and never against the live site in the hour
  before a crit.
- Ask before deleting anything, local data included, and say what will go.
- A `crit-<n>` tag can move to a new deploy before that crit's cutoff, never
  after.

## Writing

- `README.md` is mine to write. Point out gaps and word counts; don't rewrite
  my prose unless I ask.
- If I ask you to draft `PROCESS.md`, an ADR or a reflection, build it only
  from what I decided and said, and tell me which lines are yours so I can
  check them. Never claim I did something I haven't, like a test I haven't run.
