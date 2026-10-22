# 3475 Tundra Arm League — Code Structure

The application JavaScript is split by responsibility so new features can be added without turning one file into a monolith.

| File | Responsibility |
|---|---|
| `core.js` | Supabase client, auth state, `STAFF_ROLES` and permission helpers (`canEditAlliance`, `canManageLegion`), shared UI helpers (`showToast`, `showCustomConfirm`), initialization |
| `navigation.js` | Alliance/legion navigation; shows or hides the roster toolbar buttons (Assign, Bulk Assign, Bulk Remove) per permission |
| `schedule.js` | Legion match schedules |
| `leaderboard.js` | Data loading (`fetchData`, `loadedTroopsData`), search, sorting, pagination, table rendering |
| `player.js` | Add/edit/delete player data |
| `legion.js` | Roster management: single Assign, Bulk Assign, Bulk Remove, Battle/Substitute role toggle |
| `frostdragon.js` | Frostdragon Tyrant tools: task constants and parsing, task editing, "View by Alliance" filter, Roster Chart (chart/image/Live Edit), summary, Battlefield schedule, roster lock, Dragonite auto-assign, admin checklist, FDT Guide |
| `export.js` | CSV export (includes Frostdragon role/task columns on the FDT roster) |
| `footer.js` | President/Guild footer settings and live clock |
| `effects.js` | Opening animation and snow effect |
| `president-panel.js` | President dashboard, global Battle Theme switch, staff accounts, `getRoleField()` |
| `redeem.js` | Gift code redeem popup (shared Supabase edge function with 3475.web.id) |

Scripts are loaded in dependency order from `index.html`; `frostdragon.js` loads last because it uses helpers from the other modules. Each `<script>` tag carries a `?v=` cache-busting number — bump it when the file changes.

Other files:

- `index.html` — single page with all modals; `style.css` — all styling
- `supabase_*.sql` — one-time database migrations (see **Database migrations**)
- `fdt_alliance_AB_list.md` — FDT roster list for Alliance A and B
- `README.md` — setup, features and usage; `CNAME` — custom domain

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

## Frostdragon task storage

Tasks live in `troops_power.frostdragon_task` as one comma-separated text
value (e.g. `Rally Captain, Alliance A`), `null` when empty.

- Always read with `parseFdtTasks(value)` — it normalizes legacy names
  (`Spire Lethality` -> `Spire Dragonbane`, `Spire Attack` -> `Spire Blade`)
  and drops unknown values.
- Always write through the same format: de-duplicate, join with `', '`,
  store `null` when empty (see `updateFrostdragonTask()`).
- `Alliance A` / `Alliance B` are group tasks and are mutually exclusive.
  Role tasks (Rally Captain, Spire teams, etc.) can be combined with a group.
- Every FDT write must respect the roster lock (`fdtSettings.locked`) and
  the 60-players-per-alliance limit (`FDT_MAX_PER_ALLIANCE`).

## Roster actions (`legion.js`)

| Action | Entry point | Notes |
|---|---|---|
| Assign Player | `openAddLegionModal()` / `submitLegionAssignment()` | One player; FDT also sets tasks |
| Bulk Assign | `openBulkAssignModal()` / `submitBulkAssign()` | Many players. Loads candidates (not yet in the roster) from Supabase. TAL: one role for all. FDT: tasks added to or replacing existing ones. Quotas are checked on the whole selection before saving: FDT max 60 Battle per alliance, TAL max 30 Battle / 20 Substitute |
| Bulk Remove | `openBulkRemoveModal()` / `submitBulkRemove()` | Works on the already loaded roster (`loadedTroopsData`); only the active theme's fields are cleared |

Bulk writes are chunked (100 ids per request) and use `.in('id', chunk)`.
Both bulk popups sit above the Roster Chart modal (z-index 2500) and below
the confirm dialog (2600). Both are hidden for accounts that cannot manage the
selected roster (`canManageLegion`).

## Database migrations

Run once in the Supabase SQL Editor, in this order:

1. `supabase_frostdragon_column.sql` — `frostdragon_role`, `frostdragon_task`, FDT settings on `footer_settings`
2. `supabase_frostdragon_checklist.sql` — `frostdragon_checklist` (jsonb)
3. `supabase_global_battle_theme.sql` — `battle_theme` (`tundra` / `frostdragon`)
4. `supabase_staff_accounts.sql` — staff account management (President only, checked server-side)
5. `supabase_viewer_readonly.sql` — RLS making the `member` account view-only

## Adding a feature

1. Put the code in the module that owns that responsibility; create a new
   file only when none fits, and add it to `index.html` in dependency order.
2. Check permissions with `canEditAlliance()` / `canManageLegion()`, and for FDT
   also the roster lock. Real enforcement belongs in RLS, not only the UI.
3. Branch on `getBattleTheme()` and use `getRoleField()` for roster columns.
4. Bump the `?v=` number of every changed script in `index.html`.
5. Update this file and `README.md` when structure or behavior changes.
