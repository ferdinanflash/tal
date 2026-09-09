# 3475 Tundra Arm League — Code Structure

The application JavaScript is split by responsibility so new features can be added without turning one file into a monolith.

- `core.js` — Supabase client, auth state, roles, shared UI helpers, initialization
- `navigation.js` — alliance/legion navigation
- `schedule.js` — legion schedules
- `leaderboard.js` — data loading, search, sorting, pagination, table rendering
- `player.js` — add/edit/delete player data
- `legion.js` — legion assignment and roster role management
- `export.js` — CSV export
- `footer.js` — President/Guild footer settings and live clock
- `effects.js` — opening animation and snow effect

Scripts are loaded in dependency order from `index.html`.
