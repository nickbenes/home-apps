# Issues Backlog
_Surfaced at standup (section 6 of `agents/xo/standup-protocol.md`) — distinct from
`briefing_items.md`. Reminders are personal/situational things Nick wants to be nudged about.
**Issues backlog entries are things an agent itself flagged** while doing its work — a
discrepancy, an open decision, a risk — annotated with which agent raised it so XO can present
"who's asking" alongside "what." Reordering/prioritizing happens at standup; this file just
holds the list between briefings._

## Format
```
- [STATUS] issue text
  - raised by: <agent>
  - raised: YYYY-MM-DD
  - priority: high | medium | low (set/changed at standup, default medium when first raised)
  - status: open | discussing | resolved
  - notes: short context, link to source file if relevant
```

## Open

- [open] TBOM/Destiny Mastercard statement balance ($732.09) doesn't match the $850 balance in
  `finances/_accounts/TBOM-Destiny-Mastercard.md`
  - raised by: email-triage
  - raised: 2026-06-22
  - priority: medium
  - status: open
  - notes: see `_meta/triage/2026-06-22_email-digest.md`. Worth checking during the finances
    reconciliation pass.


- [open] 8 inbox threads held back from the 2026-06-23 full-backlog cleanup, need Nick's review
  (not archived, still sitting in inbox)
  - raised by: email-triage
  - raised: 2026-06-23
  - priority: medium
  - status: open
  - notes: see `_meta/triage/2026-06-23_general-cleanup-full-backlog.md` for the full list —
    a recruiter email (Utilidata), a cafe promo thread with a `SENT` label (possible real
    correspondence), two Leadership Lincoln alumni appeals, a CofC alumni event invite, two
    Dispatch newsletter issues, a wherepeteris.com blog notification, and a Mary Trump Media
    newsletter issue. None archived — held back per the "don't archive anything personalized"
    rule, same as the pilot's recruiter/no-preview holdbacks.

- [open] General-inbox cleanup backlog not fully exhausted — re-run search after this session
  to check what's left
  - raised by: email-triage
  - raised: 2026-06-23
  - priority: low
  - status: open
  - notes: 222 threads archived this run (172 promotions + 50 social) against an unreliable
    "200+ per bucket" estimate (`resultCountEstimate` doesn't update live mid-session — same
    gotcha hit during the Substack backlog clear). Re-run
    `category:promotions older_than:30d -label:Triage/Archived -label:Triage/Reviewed
    -is:starred -is:important` (and the `category:social` equivalent) to see what remains.

- [open] Add `category:updates` (receipts, shipping notices) to general-inbox cleanup scope?
  - raised by: email-triage
  - raised: 2026-06-22
  - priority: low
  - status: open
  - notes: deferred in favor of starting narrower with promotions/social only.

- [open] School-email triage flow is unverified with live data (LCPS summer break) — also,
  the `[Gmail]/School` label appears applied inconsistently historically, may need to rely on
  sender/subject pattern matching instead
  - raised by: email-triage
  - raised: 2026-06-22
  - priority: low
  - status: open
  - notes: re-test once school emails start arriving in the fall.

- [open] Re-evaluate XO-as-orchestrator once 2-3 more domain agents exist for real
  - raised by: xo
  - raised: 2026-06-22
  - priority: low
  - status: open
  - notes: see `_meta/research/2026-06-22_hermes-orchestrator-research.md` — current design is
    a manifest-driven router with no separate runtime; worth checking this still holds once
    there's real multi-agent delegation traffic to observe.

- [open] Finances reconciliation pass (carried over from prior sessions, predates this backlog)
  - raised by: nick (pre-existing open item, added here for visibility)
  - raised: 2026-06-18
  - priority: medium
  - status: open
  - notes: see `_memory/current.md` — numbers in `finances/` are known-stale pending this pass.

- [open] File retention strategy needed for `_session_logs/`, `_handoff/`, and `_meta/triage/`
  — these will keep accumulating daily with no pruning/archiving plan
  - raised by: nick
  - raised: 2026-06-22
  - priority: low
  - status: open
  - notes: explicitly deferred until there's a real sense of volume — don't design a retention
    policy preemptively. Revisit once these folders have enough files to judge.

## Resolved

- [resolved] Should non-Substack political/commentary newsletters (The Dispatch, Mary Trump
  Media, wherepeteris.com) get folded into `agents/newsletter-digest`'s scope, broadened past
  `label:Substack`?
  - raised by: email-triage
  - raised: 2026-06-23
  - resolved: 2026-06-23 (via `_inbox/Notes from email cleanup.md`)
  - notes: Nick confirmed — treat non-Substack newsletters the same as Substack ones in the
    newsletter-digest pipeline. `agents/newsletter-digest/manifest.md` scope needs updating to
    match (not Substack-label-only anymore).

- [resolved] Scale general-inbox cleanup to the full backlog, or keep sampling in small batches?
  - raised by: email-triage
  - raised: 2026-06-22
  - resolved: 2026-06-23 (morning standup)
  - notes: pilot (23 of 25 sampled archived, ~200+ threads/bucket estimated) approved by Nick —
    scale to the full `category:promotions`/`category:social` 30d+ backlog. To run after this
    standup's wrap-up/turnover finishes, same `Triage/Archived` (`Label_27`) convention as the
    pilot.

- [resolved] Substack newsletter backlog (~201 unprocessed threads) — process retroactively, or
  start fresh from today forward?
  - raised by: newsletter-digest
  - raised: 2026-06-22
  - resolved: 2026-06-22 (same evening)
  - notes: Nick decided "fresh start going forward" — no retroactive digest. 327+ backlog
    threads bulk-labeled `Triage/Reviewed` (without reading/summarizing) back through
    2026-06-04, clearing the signal; older pre-2026-06-04 backlog intentionally left unlabeled,
    not a gap. See `agents/newsletter-digest/manifest.md`'s "Backlog scope resolved" note. Also
    established as a permanent standing rule from this same decision: any future Substack issue
    from `benbaran@substack.com` must be flagged for the next XO standup — see that manifest's
    new "Standing sender rule: Ben Baran" section.

- [resolved] home-apps `todos` module needed a full rewrite (in-memory storage, no running
  service)
  - raised by: notes-todos
  - raised: 2026-06-22
  - resolved: 2026-06-22
  - notes: [PR #76](https://github.com/nickbenes/home-apps/pull/76) — SQLite-backed storage,
    running `todos.service`, persistence verified. `Todos.md` deprecated, 5 existing todos
    migrated to the live API. Local folder also renamed `bills-tracker` → `home-apps`.

- [resolved] notes-todos created a duplicate calendar event (Ian's ortho appt, 6/23) because it
  only checked/wrote to the primary calendar, not the shared Family calendar Maureen already
  had the same appointment on
  - raised by: xo
  - raised: 2026-06-22 (evening wrap-up)
  - resolved: 2026-06-22 (later same evening)
  - notes: `agents/notes-todos/manifest.md` now has an explicit "Calendar dedup check" section
    — before creating any event, check `list_events` across every calendar a family member
    might use (primary, Family, Home School, GSS School, kids' personal calendars — IDs
    confirmed via `list_calendars`) for a loose-match duplicate (same approximate date +
    overlapping time + similar title/keyword), and skip creation if found, or flag as a
    briefing item if genuinely ambiguous rather than guessing.
