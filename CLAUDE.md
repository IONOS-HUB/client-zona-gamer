# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Zona Gamer is a Vue 3 + TypeScript e-commerce storefront (built with Vite) for selling shared/digital PS4 & PS5 game accounts and combos, primarily targeting Ecuador (USD) and Colombia (COP). Firebase (Auth + Firestore) is the only backend — there is no separate API server. Data is read/written directly from Vue components and composables via the Firebase JS SDK, and access control is enforced by `firestore.rules`.

## Commands

```sh
npm run dev          # Start Vite dev server
npm run build         # Type-check (vue-tsc) + build for production (run in parallel via npm-run-all2)
npm run build-only    # Build without type-checking
npm run type-check    # Type-check only (vue-tsc --build)
npm run preview       # Preview the production build locally
```

There is no test runner or lint script configured in `package.json` — do not assume `npm test` or `npm run lint` exist.

Environment variables live in `.env` (see `.env.example`), all prefixed `VITE_FIREBASE_*` and consumed in `src/config/firebase.ts`. Copy `.env.example` to `.env` and fill in Firebase Console credentials before running `npm run dev`.

## Architecture

### Auth & roles
Three roles: `client` (default/no Firestore doc), `employee`, `admin`. Role is stored in `users/{uid}` in Firestore (see `src/types/user.ts`), not in Firebase Auth claims.
- `src/composables/useAuth.ts` — sign in/up/out via Firebase Auth, plus a "day changed" auto-logout mechanism: login date is cached in `localStorage` (`zonagamer_session_date`), and if the calendar day has changed since login, the session is force-signed-out.
- `src/composables/useRoles.ts` — loads/writes the `users/{uid}` doc, exposes `isAdmin`/`isEmployee`/`isClient`/`hasAdminAccess`/`hasEmployeeAccess` computeds. Uses module-level (singleton) `ref`s, so role state is shared across all components without a Pinia store.
- `src/router/index.ts` — the navigation guard is the single place enforcing `requiresAuth` / `requiresRole` (`admin`, `employee`) meta fields, waits for Firebase Auth to initialize before deciding, checks the day-changed auto-logout, and also drives per-route SEO (`document.title`, meta description, robots, canonical URL) from route `meta`.
- `firestore.rules` is the actual authorization boundary — role checks in the client are UX only; assume Firestore rules are the source of truth when reasoning about what a role can/cannot do.

### Data model (Firestore)
Full schema documented in `ESTRUCTURA_BDD.md` — read it before making non-trivial changes to games/combos data shapes. Key structure:

```
games/{platform}/juegos/{gameId}/correos/{emailId}   # platform: 'PS4 & PS5' | 'PS4' | 'PS5'
combos/{platform}/combos/{comboId}/correos/{emailId}
```

Each "juego"/"combo" is a container document; each `correos` subdocument represents one email account holding that game/combo, with an array of `cuentas` (account owners, one per `AccountType`: `Principal PS4`, `Secundaria PS4`, `Principal PS5`, `Secundaria PS5`). Stock is derived by counting `cuentas[].hasStock === true` across all correos of a game — there is no separate stock counter field.

Pricing: every game/combo has a `GamePrices` object with 8 fields — 4 account types × 2 currencies (USD `psXPrincipal`/`psXSecundaria`, COP `psXPrincipalCOP`/`psXSecundariaCOP`). A legacy single `costo` field is still read as a fallback for older documents — when touching pricing logic, preserve that fallback rather than assuming `precios` is always populated.

`GameSummary` (used for lists/cards) vs `GameEmailAccount` (one correo's full data, including `codigoMaster`/`codigosGenerados` — generated redemption codes) are distinct types in `src/types/game.ts`; combos mirror this shape in `src/types/combo.ts`. Unauthenticated users can read game summaries but not the `correos` subcollection — composables that fetch `correos` (e.g. `useGames`, `useCombos`) catch permission errors and fall back to parent-document data rather than throwing.

`src/composables/useGames.ts` and `useCombos.ts` cache Firestore reads in `localStorage` per platform (`games_cache_{platform}` / combos equivalent) with a 30-minute TTL, to reduce Firestore reads on repeat visits. When changing what a game/combo fetch returns, check whether the cache key/shape needs to change too, and whether cache invalidation (`clearCache`) needs to be called after writes.

### State management
- Pinia (`src/stores/cart.ts`) is used only for the shopping cart, which persists to `localStorage` (`zona_gamer_cart`) and includes a migration path for older stored cart shapes (missing `selectedAccountType` or `precios`).
- Everything else (auth, roles, currency, games/combos data) uses composables with module-level `ref`s as ad-hoc singletons rather than Pinia stores — follow this existing pattern rather than introducing new Pinia stores for non-cart state.

### Currency
`src/composables/useCurrency.ts` toggles between USD (Ecuador) and COP (Colombia) globally (persisted to `localStorage`), and pricing components must read the correct one of the 8 `GamePrices` fields based on both selected currency and selected account type.

### Views & code splitting
Routes in `src/router/index.ts` are all lazy-loaded (`() => import(...)`). `vite.config.ts` further splits the production build into manual chunks: `vendor-firebase`, `vendor-charts`, `vendor-vue`, `vendor-ui`, plus dedicated `admin`, `employee`, and `composables` chunks — keep admin-only and employee-only code under `src/{components,views}/{admin,employee}/` so it stays out of the public bundle.

`src/views/HomeView.vue` lazy-loads its section components for performance — follow that pattern when adding new homepage sections rather than importing them eagerly.

### Path alias
`@` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

## Conventions (from `.cursor/rules/personalizate.mdc`)

- Composition API with `<script setup>`; avoid the Options API and avoid classes.
- Composables are named `use<Thing>` and colocated in `src/composables/`.
- Component filenames are PascalCase.
- Prefer named exports.
- TypeScript everywhere; prefer `interface` over `type` for extendable object shapes; avoid enums (use string literal unions / maps instead, as seen throughout `src/types/`).
- Styling is Tailwind CSS + daisyUI, mobile-first.
- Much of the domain vocabulary in code, comments, and Firestore fields is Spanish (e.g. `juego`, `correo`, `cuenta`, `precios`) — match existing naming rather than translating to English mid-file.
