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
- `redeem.js` — Redeem Code modal
- `statetracker.js` — State Tracker (navbar button next to Login + own modal): State rankings

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

## Foundry Battle Roster (IDN)

- `foundry.js` — halaman Foundry (roster 2 Legion x 30 Battle + 10 Cadangan, bulk assign, peta, strategi); dibuka dari menu utama lewat `openFoundry()`
- `supabase_foundry_roster.sql` — kolom `foundry_*` pada `troops_power` (dijalankan sekali di Supabase SQL Editor). Terpisah dari `legion_role` dan `frostdragon_role`, jadi tidak saling menimpa.
- `supabase_foundry_p3.sql` — kolom tambahan `foundry_p3` (target Phase 3), `foundry_cover` (slot yang digantikan cadangan), `foundry_ready` (bitmask checklist kesiapan). Dijalankan sekali setelah `supabase_foundry_roster.sql`. Bila belum dijalankan, `foundry.js` tetap jalan (mode lama Phase 2/3) dan menampilkan pemberitahuan.

Fitur Foundry: peringatan roster per Legion/Phase (`FOUNDRY_MIN`), target 3 fase terpisah (`foundryTarget`), pemetaan cadangan, salin Discord per fase, ekspor PNG peta (`foundryExportPng`, kanvas), tab Checklist kesiapan, dan tanggal verifikasi (`FOUNDRY_VERIFIED`) di tab Strategi.
- Planner tugas (`foundryPlanTasks`, `foundryPlanScore`): untuk n pemain Battle, memilih n dari 30 posisi template secara greedy menurut skor cakupan Phase 1/2/3 (poin/menit bangunan x lama fase x pemain terpasang/minimal `FOUNDRY_MIN`); Commander lalu penjaga Boiler Room selalu dipilih lebih dulu (`FOUNDRY_PLAN_FIRST`), `FOUNDRY_PRIORITY` hanya pemutus seri; `FOUNDRY_MIN` mencakup bangunan yang tetap ada di fase berikutnya (Boiler, Transit, Munitions, Mercenary). Dipakai bersama oleh tombol Hitung Tugas dan Isi Otomatis (`foundryLegionJobs`: Battle urut Power, cadangan urut Power, `foundry_cover` dipetakan ulang/diisi ke slot paling kritis).
- Planner tugas (`foundryPlanTasks`, `foundryPlanScore`): untuk n pemain Battle, memilih n dari 30 posisi template secara greedy menurut skor cakupan Phase 1/2/3 (poin/menit bangunan x lama fase x pemain terpasang/minimal `FOUNDRY_MIN`); Commander lalu penjaga Boiler Room selalu dipilih lebih dulu (`FOUNDRY_PLAN_FIRST`), `FOUNDRY_PRIORITY` hanya pemutus seri; `FOUNDRY_MIN` mencakup bangunan yang tetap ada di fase berikutnya (Boiler, Transit, Munitions, Mercenary). Dipakai bersama oleh tombol Hitung Tugas dan Isi Otomatis (`foundryLegionJobs`: Battle urut Power, cadangan urut Power, `foundry_cover` dipetakan ulang/diisi ke slot paling kritis).
- Kalkulasi tugas: `foundrySummaryHtml` (ringkasan jumlah/Power/potensi poin per bangunan per fase) dan `foundryRecalcTasks` (urut Power, slot dipadatkan 1..N, role/target dihitung dari `FOUNDRY_PRIORITY`; cadangan `foundry_cover` ikut dipetakan ulang).
- `foundry.js` tab **📊 Grafik** (`foundryChartSvg`, `foundryChartExportPng`): grafik roster per Legion/Phase (cakupan bangunan, peran, urutan slot + Power, cadangan). Live Share: `?foundry=chart&legion=Legion%201&phase=1` (`openFoundrySharedChart`, auto-refresh 30 detik, read-only).

- Kalkulasi Joiner otomatis (`foundryRallyTeams`, `foundryJoinerOf`, `foundryRallyHtml`): Joiner dipasangkan ke Rally Leader dari data roster (tanpa kolom database baru): urut Power, prioritas Rally Leader dengan target Phase 1 sama, lalu diseimbangkan menurut total Power tim. Tampil di panel 🤝, tag di kolom Role, peringatan roster, dan salinan Discord (Phase 2 / semua).
- Isi Otomatis & Hitung Tugas kini memakai kalkulasi Joiner terbaru: `foundryJoinerCalc` (inti march penguatan, dipakai juga `foundryJoinerPlan`) dan `foundryPlanCover` (stationed + march Rally Leader/Joiner per fase) menggantikan hitungan pemain-yang-ditempatkan saja di `foundryPlanScore` dan `foundryShortages`. Peringatan roster (`foundryWarnings`) ikut menghitung march penguatan agar konsisten dengan tabel Garrison.
- Perbaikan planner Hitung Tugas/Isi Otomatis (selaras tab Strategi): `FOUNDRY_MIN` Situs Prototipe dan tiap Fasilitas Perbaikan = 2 penjaga di semua fase; `foundryPlanCoverParts` memisahkan penjaga di tempat vs march penguatan, dan `foundryPlanScore` menghitung march hanya `FOUNDRY_MARCH_WEIGHT` (0,5) serta mengurangi nilai bangunan yang tidak punya penjaga sendiri. Roster < 30 kini mempertahankan Holder Prototipe/Perbaikan lebih dulu dan membuang Mobile/Collector terakhir. Tabel Garrison dan peringatan roster tetap menghitung march penuh.

## State Tracker

- `statetracker.js` — tombol **State Tracker** di navbar (di samping Login) membuka `#state-tracker-modal` (`openStateTrackerModal()` / `closeStateTrackerModal()`). Data list: `https://api.wosatlas.com/v1/states/summary` (50 State per request, urut `chiefs`). Halaman pertama dimuat saat modal dibuka; sisanya hanya saat dibutuhkan (cari ID/aliansi, urutan selain Chiefs, tombol Show more), 3 request paralel. Data di-cache 5 menit; Refresh memuat ulang.
- Panggilan langsung dari browser lebih dulu; bila diblokir (CORS/jaringan) otomatis memakai edge function `wosatlas-states` (sumber: `index.ts`, deploy: `supabase functions deploy wosatlas-states`).
- Edge function actions:
  - `summary` (default) — proxy ke `/v1/states/summary` (limit/offset di-clamp, cache memori 5 menit)
  - `detail` — body `{ action: "detail", kid, allianceLimit? }`; server mengambil paralel `/v1/states/{kid}`, `/v1/kingdoms/{kid}/power`, `/v1/alliances/leaderboard?kid={kid}` dan mengembalikan `{ state, power, alliances, kid }`
- Terjemahan (6 bahasa) didaftarkan di bagian atas `statetracker.js` lewat `I18N.addText`. State `3475` (`CFG.myState`) disorot di tabel.
- Klik baris State (atau Enter) membuka tampilan detail di dalam modal yang sama (tombol Back / Esc kembali ke daftar), meniru tampilan halaman detail State:
  - Ringkasan list: chiefs, alliances, total/median/max power, top alliance, bandingkan vs State 3475.
  - Detail ekstra (cache 5 menit): rank antar State, players, total/median/max power, king, ranked population, top alliances table, top players table.
  - Client: direct dulu, lalu proxy `action: "detail"` bila gagal (atau sebaliknya jika mode list sudah `proxy`).
  - Bila keduanya gagal, UI tetap menampilkan data summary + peringatan.
- Header kolom bisa diklik untuk mengurutkan. Peringkat relatif antar State dan perbandingan penuh butuh semua halaman list dimuat (tombol "Load all States").

## Roster Foundry/TAL: hapus, pindah, dan loading (v42)

- Sistem "Replaces slot" (`foundry_cover` / `tundra_cover`) dihapus dari UI: kolom di tabel Cadangan, peringatan, Hitung Tugas / Isi Otomatis, salinan Discord, chart, dan Live Share. Kolom DB dibiarkan (nilai lama hanya di-null saat pemain dipindah/dihapus).
- Tiap pemain di roster punya dua tombol: `⇄` (`foundryOpenMove`, pindah ke legion mana pun termasuk Legion 1/2 - Alliance B, sebagai Battle atau Cadangan) dan `✕` (`foundryRemovePlayer`, hapus dari roster dengan konfirmasi). Hapus banyak sekaligus tetap lewat Bulk Remove.
- Slot kosong tidak lagi berisi dropdown semua pemain bebas; pemain baru dimasukkan lewat Bulk Assign.
- Loading: `foundryLoad` hanya memuat pemain yang sudah di roster. Daftar pemain bebas diambil saat Bulk Assign dibuka (`foundryEnsureCandidates`). Pindah antar legion memakai data cache selama < 20 detik (`FOUNDRY_FRESH_MS`). `foundryRallyTeams` dan `foundryJoinerPlan` di-memo per legion (`foundrySig`).
- Export CSV roster Foundry/TAL: `foundryExportBarHtml` (dropdown cakupan + tombol di atas tabel roster) dan `foundryExportCsv`. Cakupan: legion aktif (Battle + Cadangan / Battle saja / Cadangan saja), legion lain termasuk Alliance B, atau semua legion. Kolom: Legion, Roster, Slot, Alliance, Nickname, Game ID, Troops Power, Role, Phase 1-3, Joins Rally Leader, Can Join. Butuh login (`canViewSensitive`), memakai `csvSafeField` dari export.js (anti formula injection) + BOM UTF-8.
- Salin untuk Discord (`foundryCopyText`): hanya daftar nama pemain terdaftar per Legion (Battle lalu Cadangan), tanpa role, fase, target, atau tim rally. Dropdown pilihan fase dihapus dari admin bar.
- Ruang Ketel di Hitung Tugas / Isi Otomatis: minimum penjaga Boiler di Phase 2 dan 3 naik dari 1 ke 2 (`FOUNDRY_MIN`). Template slot 26 kini Holder Transit di P1 lalu Boiler di P2/P3, dan slot 26 masuk `FOUNDRY_PLAN_FIRST` (roster >= 17 pemain), jadi Boiler tetap 2 penjaga stationary dari Phase 1 sampai 3 tanpa mengurangi Gudang Amunisi / Kamp Bayaran. `critical` di `foundryPlanScore` ikut mencakup Boiler P2/P3.
- Pos Transit di Phase 2 kini minimum 2 penjaga (`FOUNDRY_MIN`), sama seperti Boiler: slot 24 = Holder Boiler (P1) -> Transit (P2) -> Kamp Bayaran (P3); slot 24 masuk `FOUNDRY_PLAN_FIRST` (roster >= 18 pemain) dan `critical` mencakup Transit P2. Kamp Bayaran P2 dicover mobile slot 11 / march Joiner.

## Task Cadangan / Substitute (v45)

- Cadangan kini punya task sendiri: role + target Phase 1-3. Disimpan di kolom yang sama dengan Battle (`foundry_role` / `foundry_p1..p3`, atau `tundra_*` di mode TAL) sehingga **tidak perlu SQL baru**. Cadangan tidak ikut `foundryAssigned`, ringkasan, garrison, dan peringatan Battle, jadi hitungan Battle tidak berubah.
- Roster (Foundry IDN & TAL Legion 1/2/Alliance B): tabel Cadangan punya kolom Role + Phase 1-3 (dropdown untuk staff). Tombol **🎯 Atur Task Substitute** (`foundrySubTasksOpen`, modal `#fy-sub-modal`) dan **🧮 Auto Calculate Task Substitute Only** (`foundrySubRecalcTasks`) ada di toolbar dan di atas tabel Cadangan. Modal juga punya tombol reset (`foundrySubClearTasks`).
- Auto Calculate Task Substitute Only (`foundrySubPlanCalc`): hanya Cadangan yang diubah, Battle tidak disentuh. Cadangan diurutkan menurut Power; tiap Phase dipasang ke bangunan yang paling kekurangan penjaga (selisih `FOUNDRY_MIN` x poin/menit, memperhitungkan penjaga Battle + march Rally Leader/Joiner + Cadangan yang sudah dipasang). Bila semua minimum tertutup: Phase 1 = Roamer, Phase 2/3 = Tanur Imperial. Role = Mobile bila >= 2 phase berupa roam/workshop, selain itu Holder.
- Chart & gambar: tab Grafik (`foundryChartSvg`) menampilkan bar putus-putus transparan "+N cad" per bangunan dan daftar Cadangan dengan role -> target phase; Live Share Chart ikut otomatis. Ekspor PNG Peta (`foundryExportPng`) menambah blok daftar Cadangan (All Phase = P1/P2/P3). Tab Peta menampilkan Cadangan per bangunan, Live Share Map menampilkan role + target Cadangan, Export CSV mengisi Role + Phase 1-3 untuk Cadangan.
- Auto-fill / Hitung Tugas Battle tidak menimpa task Cadangan; Battle yang tergeser jadi Cadangan dikosongkan tasknya (jalankan Auto Calculate Task Substitute Only setelahnya).
- Service worker naik ke `tal-foundry-sw-v45`; cache-bust `foundry.js?v=47`, `style.css?v=62`.

## Legion Visibility di Main Menu (v46)

- President Panel punya kartu **👁️ Legion Visibility — Main Menu**: checklist Legion 1, Legion 2, Legion 1 — Alliance B, Legion 2 — Alliance B. Centang = tampil di menu utama; dicabut = kartu disembunyikan untuk semua pengunjung (global, realtime + polling seperti Battle Theme). Data roster tidak berubah dan legion tetap bisa dibuka dari President Panel.
- Disimpan di `footer_settings.hidden_legions` (daftar key yang disembunyikan: `l1,l2,l1b,l2b`). Jalankan `supabase_legion_visibility.sql` sekali. Dibaca lewat query terpisah di `loadGlobalBattleTheme`, jadi kolom yang belum dibuat tidak mengganggu Battle Theme / Alliance B (semua legion tetap tampil).
- Alliance B tetap butuh saklar "Legion Cadangan — Alliance B"; kartu Alliance B tampil bila saklar aktif DAN tidak disembunyikan. Tema Frostdragon mengabaikan pengaturan ini.
- Logika ada di `applyAllianceBVisibility` (`LEGION_MENU_ITEMS`, `presidentToggleLegionVisible`). Menu utama memakai id `legion-btn-1` / `legion-btn-2` / `legion-btn-1b` / `legion-btn-2b`. SW `tal-foundry-sw-v46`, `president-panel.js?v=13`, `style.css?v=63`.

## Fix navbar mobile (v47)

- Tombol **President Panel** terpotong di HP (<= 600px) karena 5 tombol navbar dipaksa satu baris dengan `nowrap` + `overflow:hidden`. Kini baris navbar boleh wrap dan tombol President Panel memakai satu baris penuh sendiri (`style.css`, blok "Mobile nav fix"). Desktop tidak berubah. SW `tal-foundry-sw-v47`, `style.css?v=64`.

## Legion Alliance Tags (v48)

- Menu utama: tiap kartu legion punya baris tag aliansi di kanan jadwal (`.legion-sched-row` + `#legion-tags-l1|l2|l1b|l2b`). Tag tetap tampil walau jadwal belum diisi.
- President Panel: kartu **🏷️ Legion Alliance Tags** — per legion pilih satu atau lebih aliansi (ARX, IDN, VNX, ZXC, CAT), tersimpan langsung dan global (realtime + polling seperti Battle Theme).
- Disimpan di `footer_settings.legion_tags` (teks JSON, mis. `{"l1":["ARX","CAT"],"l2":["IDN"]}`). Jalankan `supabase_legion_tags.sql` sekali. Dibaca lewat query terpisah di `loadGlobalBattleTheme`, jadi kolom yang belum dibuat tidak mengganggu fitur lain.
- Kode: `LEGION_TAG_ALLIANCES`, `parseLegionTags`, `applyLegionTags`, `presidentToggleLegionTag` di `president-panel.js`. SW `tal-foundry-sw-v48`, `president-panel.js?v=14`, `style.css?v=65`.
