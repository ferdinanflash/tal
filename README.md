# 3475 Tundra Arm League

A roster and leaderboard management site for state **3475** in *Whiteout Survival*.
It tracks Troops Power for five alliances and manages battle rosters for two event modes:

- **Tundra Arm League (TAL)**: Legion 1 and Legion 2 (max 30 Battle, max 20 Substitute).
- **Frostdragon Tyrant (FDT)**: a single Battle Group with two alliance groups (Alliance A and B, max 60 players each) and no substitutes.

Live: <https://tal.3475.web.id>

---

## Features

| Area | Feature |
|---|---|
| **Leaderboard** | Troops Power per alliance (ARX, IDN, VNX, ZXC, CAT) with search, sorting and pagination |
| **Players** | Add, edit and delete players (nickname, Game ID, power, preferred time) |
| **Legion roster** | Assign players to Legion 1 / 2 as Battle or Substitute, plus legion match schedules |
| **FDT roster** | Assign players to the FDT roster with per-player tasks (Rally Captain, Tyrant Candidate, Capital Reinforcer, Capital Defense, Spire Life/Shield/Dragonbane/Blade, Dragonite Collector, Alliance A/B) |
| **Bulk Assign / Bulk Remove** | Select many players at once to add to or remove from a roster. In FDT, tasks can be added to or replaced on all selected players |
| **FDT tools** | Auto-assign Dragonite Collectors, roster summary, Battlefield schedule (UTC) with countdown, deadline, roster lock, admin phase checklist, FDT Guide |
| **Roster Chart** | Interactive chart and downloadable PNG of the FDT roster, with *Live Edit* directly on the chart |
| **Export** | CSV export of the roster |
| **Redeem Code** | Gift code redeem popup (uses a Supabase edge function shared with the 3475.web.id site) |
| **President Panel** | Global Battle Theme switch (Tundra / Frostdragon) and staff account management |
| **Visuals** | Opening animation and snow effect |

## Access control

Login uses Supabase Auth. Staff usernames are stored as emails in the form `<username>@3475-staff.internal`.

| Account | Access |
|---|---|
| `demon` (President) | Full access plus staff account management |
| Any other account not listed below | Full access (`full` scope) |
| `arx`, `idn`, `vnx`, `zxc`, `cat` | Edit players of their own alliance only |
| `tal` | Manage the Legion 1 and Legion 2 rosters |
| `member` | **View only**: can see Game ID and power, cannot change anything |

Roles are defined in `STAFF_ROLES` in `core.js`. The view-only restriction is also enforced in the database through RLS (`supabase_viewer_readonly.sql`), so it cannot be bypassed from devtools.

## Tech stack

- Plain HTML, CSS and JavaScript (no framework, no build step)
- [Supabase](https://supabase.com) (Postgres, Auth, Edge Functions) through `@supabase/supabase-js@2` loaded from a CDN
- Static hosting with a custom domain (see `CNAME`)

## Project structure

```
index.html            Single page + all modals
style.css             All styling
core.js               Supabase client, auth, roles, shared UI helpers, initialization
navigation.js         Alliance / legion navigation
leaderboard.js        Data loading, search, sorting, pagination, table rendering
player.js             Add / edit / delete players
legion.js             Assign, roles, Bulk Assign, Bulk Remove
frostdragon.js        FDT tools: tasks, summary, chart, schedule, lock
schedule.js           Legion schedules
export.js             CSV export
footer.js             Footer settings and live clock
president-panel.js    President dashboard, global Battle Theme, getRoleField()
redeem.js             Gift code redeem popup
effects.js            Opening animation and snow effect
supabase_*.sql        Database migrations (see below)
fdt_alliance_AB_list.md  FDT roster list for Alliance A and B
MODULES.md            Module architecture notes
```

Script load order is defined in `index.html` (`frostdragon.js` loads last). When you change a JS or CSS file, bump the `?v=` number on its tag so browsers refresh the cache.

## Data model

Two tables are used:

**`troops_power`**: one shared player pool for both themes.

| Column | Description |
|---|---|
| `id`, `alliance`, `nickname`, `game_id`, `troops_power`, `preferred_time` | Basic player data |
| `legion`, `legion_role` | TAL roster (`Legion 1`/`Legion 2`, `Battle`/`Substitute`) |
| `frostdragon_role` | FDT roster (`Battle` or `null`) |
| `frostdragon_task` | FDT tasks as comma-separated text, e.g. `Rally Captain, Alliance A` |

**`footer_settings`**: a single site-wide settings row (`id = 'main'`): footer, schedule, `battle_theme`, `frostdragon_battlefield_open_utc`, `frostdragon_roster_deadline_utc`, `frostdragon_roster_locked`, `frostdragon_checklist`.

TAL and FDT rosters live in separate columns so they never overwrite each other. Use `getRoleField()` (`president-panel.js`) to pick the role column for the active theme. See [MODULES.md](MODULES.md) for details.

## Setup

### 1. Supabase

1. Create a Supabase project with the `troops_power` and `footer_settings` tables.
2. Run the migrations in the **SQL Editor**, once each, in this order:

   | File | Purpose |
   |---|---|
   | `supabase_frostdragon_column.sql` | FDT columns on `troops_power` and FDT settings on `footer_settings` |
   | `supabase_frostdragon_checklist.sql` | FDT admin phase checklist |
   | `supabase_global_battle_theme.sql` | `battle_theme` column (`tundra` / `frostdragon`) |
   | `supabase_staff_accounts.sql` | Staff account management functions (President only) |
   | `supabase_viewer_readonly.sql` | RLS policies making the `member` account view-only |

3. Create users under **Authentication → Users** using the email format `<username>@3475-staff.internal` (e.g. `demon`, `arx`, `member`).

### 2. Client configuration

In `core.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the values from your Supabase project. The anon key is public by design; data security relies on RLS.

### 3. Run locally

No build is needed. Serve the folder with any static server and open it in a browser:

```bash
npx serve .
# or
python3 -m http.server 8000
```

### 4. Deploy

Upload the whole folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.). The `CNAME` file holds the custom domain `tal.3475.web.id`.

## FDT workflow (short)

1. The President switches the theme to **Frostdragon** in the President Panel.
2. Admins add players to the FDT roster (one at a time with **Assign Player**, or many at once with **Bulk Assign**).
3. Set each player's group (Alliance A/B) and tasks; use **Auto-assign Dragonite** if needed.
4. Review the summary and **View as Chart**, then export CSV or download the chart image.
5. Set the Battlefield schedule and deadline, then **Lock roster** when final.

Roster rules in use: Rally Captain = top 1-6 (including the Tyrant Candidate); Capital Reinforcer/Defense need at least 3,300 power; each Spire has 6 players per alliance including 1 Rally Lead; max 60 players per alliance.

## Reset FDT tasks (SQL)

Clear all FDT player tasks (the `Battle` role is left unchanged):

```sql
update public.troops_power
set frostdragon_task = null
where frostdragon_task is not null and frostdragon_task <> '';
```

To keep Alliance A/B and remove only role tasks, rebuild the value keeping just those two entries (see `FDT_ALLIANCE_TASKS` in `frostdragon.js`).

## Security notes

- Never put a `service_role` key in client code. Only the anon key belongs in `core.js`.
- Enforce important restrictions (view-only, account management) in the database/RLS, not only in the UI.
- Player Game IDs and power are only visible after login.

## License

Internal project for the state 3475 community. Whiteout Survival is owned by Century Games; this project is not affiliated with them.
