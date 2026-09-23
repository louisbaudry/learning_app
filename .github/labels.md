# Label set

Every card carries exactly two labels: one `epic:*` and one `size:*`. That
pair is what makes the board readable without opening anything — epic says
which part of the product it touches, size says what it costs.

This file is the source of truth for the set. It exists because labels are
trivially added by hand in the GitHub UI, and a one-off `epic:mobile-app`
typed into the sidebar looks right while quietly splitting the board in two.
If a label isn't in the tables below, it shouldn't exist; if it needs to
exist, add it here in the same change.

GitHub takes colours without the leading `#`, in **Settings → Labels**.
It picks black or white label text itself from the background's luminance,
so the two tables below are deliberately split by lightness: epics are
saturated and dark (white text), sizes are pale (black text). An epic label
and a size label sitting side by side never read as the same kind of thing.

## Epics

The eight epics of `BACKLOG.md`, in order. The colours run cool to warm
across the build — backend blue through mobile orange — so a board column
shows roughly how far along the work is before you read a word of it.
Foundations is deliberately neutral (it is infrastructure, not a feature
area) and launch breaks out into violet (it is not a stage of the build,
it is the end of it).

| Label | Colour | Covers |
|---|---|---|
| `epic:0-foundations` | `39414A` | Repo, tooling, specs, board hygiene |
| `epic:1-backend` | `1D5FBF` | Schema, RLS, Edge Functions, migrations |
| `epic:2-students` | `0B7285` | Admin panel: family & students |
| `epic:3-content` | `1A7F37` | Admin panel: content & AI generation review |
| `epic:4-assignments` | `9E6A03` | Admin panel: assignments & progress |
| `epic:5-mobile` | `BC4C00` | React Native / Expo app |
| `epic:6-testing` | `A40E26` | Test suites, CI, RLS verification |
| `epic:7-launch` | `8250DF` | Accessibility, i18n, private beta |

## Sizes

`BACKLOG.md`'s own scale. These are estimates of effort, not priority —
an `L` is not more important than an `S`, it just won't fit in an evening.

| Label | Colour | Means |
|---|---|---|
| `size:S` | `C2E0C6` | ≈ half a day |
| `size:M` | `FEF2C0` | ≈ 1–2 days |
| `size:L` | `F9D0C4` | ≈ 3–5 days |

## What is deliberately not here

No `status:*` labels, and no `priority:*`. Status lives in whether the
issue is open, and in the board column — duplicating it into a label means
two places to update and one of them will be wrong (`CLAUDE.md` → Where
"what's left" actually lives). Ordering is the board's vertical axis, which
is cheaper to rearrange than a priority label is to re-argue.

No `bug` label either, yet. Every bug this project has hit so far was found
while building the thing that contained it and fixed in the same branch —
none of them ever became a card. If one is ever filed and left open, that is
the moment to add the label, not before.
