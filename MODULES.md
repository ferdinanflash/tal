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
- `president-panel.js` — President dashboard, global Battle Theme switch, `getTroopsTable()`

Scripts are loaded in dependency order from `index.html`.

## Battle Theme data separation

Tundra Arm League and Frostdragon Tyrant each read/write their own Supabase
table so editing one theme's roster never touches the other:

- Tundra Arm League -> `troops_power`
- Frostdragon Tyrant -> `troops_power_frostdragon` (same columns; see
  `supabase_frostdragon_table.sql`)

Every place in the app that used to call `client.from('troops_power')` now
calls `client.from(getTroopsTable())` (defined in `president-panel.js`),
which picks the right table based on the currently active global Battle
Theme. When adding a new feature that reads/writes player roster rows,
always go through `getTroopsTable()` instead of hardcoding a table name.
