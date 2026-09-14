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
- `president-panel.js` — President dashboard, global Battle Theme switch, `getRoleField()`

Scripts are loaded in dependency order from `index.html`.

## Battle Theme roster separation

Tundra Arm League and Frostdragon Tyrant share ONE player pool — the
`troops_power` table (alliance, nickname, game_id, troops_power,
preferred_time). Adding/editing/deleting a player, and the alliance-level
leaderboards, are the same data for both themes, exactly as the President
Panel's "Switch Theme" card says: "Player data, five alliances, leaderboard
and other site information remain intact."

Only the *battle roster assignment* is theme-specific, tracked in separate
columns on that same table so the two themes can never overwrite each
other's roster:

- Tundra Arm League -> `legion` (`Legion 1` / `Legion 2`) + `legion_role`
  (`Battle` / `Substitute`)
- Frostdragon Tyrant -> `frostdragon_role` (`Battle` or `null`) — see
  `supabase_frostdragon_column.sql`. No `legion` column is used since
  Frostdragon has a single Battle Group.

`getRoleField()` (defined in `president-panel.js`) returns whichever role
column matches the currently active global Battle Theme. Any code that
reads or writes a player's roster status should go through it instead of
hardcoding `legion_role` — e.g. `player[getRoleField()]` to read, and
`{ frostdragon_role: 'Battle' }` vs `{ legion: ..., legion_role: ... }` to
write, branching on `getBattleTheme() === 'frostdragon'`.
