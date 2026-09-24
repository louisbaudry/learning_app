# `@learning-app/mobile`

Not scaffolded yet. This workspace is a placeholder so the monorepo shape
matches the decided architecture (`CLAUDE.md` — React Native + Expo, not
native Kotlin). `BACKLOG.md` #22 (Expo scaffold) is the card that actually builds it.

## Why there are no dependencies here

There used to be: Expo 57, React Native 0.87, React Navigation,
reanimated, gesture-handler, screens, safe-area-context. They were
removed on 2026-09-24, and deliberately.

The workspace contained no source files at all — this README and a
`package.json`. But `npm install` at the repo root installs every
workspace, so that dependency tree was pulled into every checkout and
every CI run, to build an app that did not exist. It carried **36 npm
advisories**, one of them critical (`tar`, via the Expo/React Native
build toolchain), none of which could be fixed without upgrading Expo
and React Native themselves — an afternoon's dependency-graph work for
an app with no code, that would need doing over at scaffold time anyway.

Nothing is lost. `create-expo-app` writes its own dependency block, at
whatever versions are current the day #22 starts, and those will be
newer than the ones pinned here were. A stale dependency list is not a
head start; it is a decision made early and then inherited without
review.

What the workspace is actually for is the *shape* — `apps/mobile`
existing, resolvable as `@learning-app/mobile`, able to import
`@learning-app/shared-types` the way `apps/admin` does. That survives
with no dependencies at all.

## When you scaffold it (#22)

Expect to add back: `expo`, `react`, `react-native`, navigation, and
`@supabase/supabase-js`, plus `@learning-app/shared-types` as a
workspace dependency. Run `npm audit` straight after and deal with what
it says *then*, while the versions are fresh and you are already in the
dependency graph — that is the cheapest moment it will ever be.
