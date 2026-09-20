# Monorepo Setup

**Status:** ✅ Complete  
**Date:** 2026-09-07  
**Structure:** Yarn/npm workspaces

## Directory Structure

```
learning_app/
├── apps/
│   ├── admin/              # Next.js admin panel (TypeScript)
│   │   ├── src/
│   │   │   ├── pages/      # Next.js pages
│   │   │   ├── lib/        # Utilities (Supabase client, etc.)
│   │   │   └── components/ # React components
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   └── .env.example
│   │
│   └── mobile/             # React Native + Expo (to be scaffolded)
│       ├── src/
│       ├── package.json
│       └── app.json
│
├── packages/
│   ├── shared-types/       # Shared TypeScript types & interfaces
│   │   ├── src/
│   │   │   └── index.ts    # All database models, enums, API types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── supabase-client/    # Supabase client utilities (future)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── package.json            # Root workspace config
├── SUPABASE_SETUP.md       # Database documentation
└── MONOREPO_SETUP.md       # This file
```

## Workspace Configuration

### Root `package.json` Workspaces

```json
"workspaces": [
  "apps/*",
  "packages/*"
]
```

This allows:
- Installing all dependencies with `npm install` from root
- Running scripts across workspaces: `npm run dev --workspaces`
- Cross-workspace imports: `@learning-app/shared-types`

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

This installs all dependencies for:
- `apps/admin` (Next.js)
- `packages/shared-types` (TypeScript types)

### 2. Set Up Environment Variables

**For the admin panel:**

```bash
cp apps/admin/.env.example apps/admin/.env.local
```

Then fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://dyjntcuovsoyhbkxnmih.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Get these from: Supabase dashboard → Settings → API

### 3. Run the Admin Panel

```bash
npm run dev -w @learning-app/admin
```

Then open: http://localhost:3000

### 4. Create a Test Account

1. Go to http://localhost:3000/login
2. Click "Sign Up" and create an account
3. Log in with those credentials
4. You'll see the dashboard

## Apps Overview

### Admin Panel (`apps/admin`)

**Status:** ✅ Scaffolded, not yet feature-complete

**What works:**
- ✅ Sign up / Login with Supabase Auth
- ✅ Dashboard shows authenticated user's profile
- ✅ Displays families (fetched from Supabase)
- ✅ Basic layout and structure

**What's next:**
- [ ] Family management (create, edit)
- [ ] Student management (add, edit, delete)
- [ ] Student list with avatars
- [ ] Content editor (create lessons)
- [ ] Question builder
- [ ] Assignment dashboard
- [ ] Device linking code generator
- [ ] Progress analytics

**Tech Stack:**
- Next.js 16 (React 18) — bumped from 14 on 2026-09-20; see `next.config.js`'s
  `agentRules: false` (disables Next 16's auto-generated
  `AGENTS.md`/`CLAUDE.md`, which would otherwise duplicate this repo's own
  root `CLAUDE.md` on every `next dev`/`build`)
- TypeScript
- Supabase JS SDK
- Vanilla CSS (future: Tailwind/Styled Components)

Also contains `src/pages/play/[code].tsx` — a temporary, no-login,
student-facing test harness (added 2026-09-15) for validating the core
assign → answer → results loop before the real mobile app exists. See its
own header comment and `CLAUDE.md`'s repository-layout entry for it; delete
or replace once `apps/mobile` is real.

### Mobile App (`apps/mobile`)

**Status:** 🚧 Placeholder only — dependencies were bumped (Expo 49→57,
React Native 0.72→0.87, React Navigation 6→7) on 2026-09-20, but no app
code exists yet to actually build against these versions. The bump left
`react` pinned to a version incompatible with the new `react-native`, plus
a stray `next` dependency that doesn't belong in an Expo app — both fixed
in the same change that discovered them, but the rest of the
React Native ecosystem packages (`react-native-gesture-handler`,
`react-native-reanimated`, `react-native-safe-area-context`) are still
pinned to their original Expo-49-era versions and may need realigning
(e.g. `npx expo install --fix`) once real app development starts here.

**Tech Stack:**
- React Native ^0.87
- Expo ^57
- React Navigation ^7 (stack)
- TypeScript
- Supabase JS SDK

**Next steps:**
1. Initialize Expo project properly
2. Set up navigation structure
3. Create student onboarding flow (device linking)
4. Build lesson dashboard
5. Implement question rendering + answer submission

## Shared Types (`packages/shared-types`)

**Status:** ✅ Complete

**Contains:**
- Database model interfaces (Profile, Family, Student, Content, etc.)
- Enums (FamilyRole, ContentStatus, QuestionType, etc.)
- API request/response types
- TypeScript strict typing across all apps

**Usage in apps:**

```typescript
import { Content, Assignment, Language } from '@learning-app/shared-types'

const lesson: Content = { ... }
const familyRole: FamilyRole = FamilyRole.Owner
```

## Development Workflow

### Running All Apps Together

```bash
npm run dev
```

This runs dev servers for all workspaces (admin on port 3000, mobile on port 19000 + Expo).

### Type Checking

```bash
npm run type-check
```

Runs TypeScript type checking across all workspaces.

### Linting

```bash
npm run lint
```

(once linters are configured)

### Building for Production

```bash
npm run build
```

Builds admin panel and other production-ready workspaces.

## Monorepo Advantages

1. **Single source of truth for types** — all apps import from `@learning-app/shared-types`
2. **Coordinated releases** — bump version in root, affects all
3. **Shared CI/CD** — one GitHub Actions workflow for all
4. **Easy refactoring** — when Supabase schema changes, update types once
5. **Code sharing** — can add `packages/supabase-queries` for shared database logic
6. **Consistent dependencies** — all apps use same versions

## Next Phase

Once admin panel is feature-complete:

1. Build mobile app fully (device linking, lesson completion)
2. Create Supabase Edge Functions (answer validation, link code redemption)
3. Add image upload + signed URLs
4. Implement analytics dashboard
5. Add AI content generation API integration

---

**Created by:** Claude Code (session: 01NzxG9jat3w5FmiE45pLc84)
