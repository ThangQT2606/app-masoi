# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:5174 (opens browser automatically)
npm run build    # production build to dist/
npm run preview  # preview production build locally
```

No test runner is configured. Playwright is installed as a dev dependency but has no test files yet.

## Architecture

This is a single-page React app (Vite + React 18) for managing Werewolf (Ma Sói) board game sessions. The entire application lives in **`src/App.jsx`** — there are no sub-components, no routing library, and no state management library.

### State machine via `screen`

Game flow is driven by a single `screen` state string that switches between named views:

```
setup_count → setup_names → setup_roles → night → day_announce → day → vote → night → … → end
```

Each `if(screen==="...")` block at the bottom of `App()` renders a complete page. Adding a new screen means adding a new `if` block and wiring transitions via `setScreen(...)`.

### Inline styles (`st` object)

All styles are defined in the `st` object at the bottom of the file (line ~618). There is no CSS file, no CSS modules, and no Tailwind. New UI elements should follow this pattern: add keys to `st`, reference via `style={st.keyName}`.

### Storage via `window.storage`

The app persists data through `window.storage.get(key)` / `window.storage.set(key, value)` — a sandbox API abstraction. `main.jsx` shims this to `localStorage` for browser development. Two keys are used:
- `werewolf-groups` — saved player name groups (JSON array)
- `werewolf-last-names` — auto-saved names from the most recent game (JSON array)

### Night phase ordering

`getNightPhases()` builds the night action sequence dynamically based on which roles are in play. Cupid + Lovers phases are prepended only on round 1. The `phaseDead()` helper marks a phase as a "fake call" (shown greyed out) when a role is dead or Cupid has already acted — the MC calls them anyway to avoid revealing info.

### Win condition

`checkWin(players)` is called after every kill event (wolf bite, witch poison, hanging, lover cascade). Returns `"wolf"` if wolves ≥ living non-wolves, `"village"` if no wolves remain, `null` otherwise.

### Lover cascade

`cascadeLovers(np, round)` checks after each death whether a lover pair triggers a chain death. Called both in `resolveNight()` and `confirmVote()`.

## Key constraints

- **Vietnamese UI** — all user-visible strings are in Vietnamese. Keep them that way.
- **Mobile-first layout** — max-width 400px, viewport locked (`user-scalable=no`). Test at mobile viewport width.
- `window.storage` is the only persistence layer — don't introduce `localStorage` calls directly into `App.jsx`; use the `window.storage` abstraction so it works in both browser and potential sandbox environments.
