// Site-wide EN / ID / Simplified Chinese dictionary
document.addEventListener('DOMContentLoaded', function () {
  if (!window.I18N) return;
  I18N.addText(`
# Navigation and common interface
Home || Beranda || 首页
Back to Menu || Kembali ke Menu || 返回菜单
Close || Tutup || 关闭
Cancel || Batal || 取消
Save || Simpan || 保存
Delete || Hapus || 删除
Edit || Ubah || 编辑
Search || Cari || 搜索
Refresh || Muat Ulang || 刷新
Loading... || Memuat... || 加载中...
Submit || Kirim || 提交
Apply || Terapkan || 应用
Reset || Atur Ulang || 重置
Export || Ekspor || 导出
Import || Impor || 导入
Add Player || Tambah Pemain || 添加玩家
Add || Tambah || 添加
Remove || Hapus || 移除
Update || Perbarui || 更新
Confirm || Konfirmasi || 确认
Yes || Ya || 是
No || Tidak || 否
Close/Open Reservation || Tutup/Buka Reservasi || 关闭/开放预约
How to use || Cara Penggunaan || 使用说明
View Applicants || Lihat Pendaftar || 查看申请者
STATUS || STATUS || 状态
LOCAL: || LOKAL: || 本地时间：
UTC: || UTC: || UTC：
PRESIDENT PANEL || PANEL PRESIDEN || 会长面板
Foundry Battle Roster || Roster Pertempuran Foundry || Foundry 战斗名单
Imperial Foundry || Foundry Kekaisaran || 帝国铸造厂
Prototype Site I || Lokasi Prototipe I || 原型地点 I
Prototype Site II || Lokasi Prototipe II || 原型地点 II
Repair Facility IV || Fasilitas Perbaikan IV || 维修设施 IV
Repair Facility II || Fasilitas Perbaikan II || 维修设施 II
Repair Facility III || Fasilitas Perbaikan III || 维修设施 III
Bulk Assign || Penetapan Massal || 批量分配
Auto-fill || Isi Otomatis || 自动填充
Strategy Guide || Panduan Strategi || 战略指南
Live Map Share || Bagikan Peta Live || 实时地图分享
Player || Pemain || 玩家
Players || Para Pemain || 玩家
Alliance || Aliansi || 联盟
Name || Nama || 名称
Power || Kekuatan || 战力
Total Power || Total Kekuatan || 总战力
Task || Tugas || 任务
Legion || Legiun || 军团
Battle || Pertempuran || 战斗
Substitutes || Cadangan || 替补
Waiting || Menunggu || 等待中
Accepted || Diterima || 已接受
Rejected || Ditolak || 已拒绝
No data available || Tidak ada data || 暂无数据
Switch language || Ganti bahasa || 切换语言

# Dynamic content and full-site labels
Language || Bahasa || 语言
Select tasks || Pilih tugas || 选择任务
All Alliances || Semua Aliansi || 所有联盟
All Tasks || Semua Tugas || 所有任务
No matching players || Tidak ada pemain yang cocok || 没有匹配的玩家
No Battle roster players yet. Assign players to the Frostdragon roster to see charts. || Belum ada pemain di roster Battle. Tetapkan pemain ke roster Frostdragon untuk melihat grafik. || 尚无战斗名单玩家。请将玩家分配到 Frostdragon 名单以查看图表。
+ Assign Player || + Tetapkan Pemain || + 分配玩家
Copy this link: || Salin tautan ini: || 复制此链接：
Copy Live Share Chart link: || Salin tautan Live Share Chart: || 复制实时分享图表链接：
Loading roster chart… || Memuat grafik roster… || 正在加载名单图表…
Unable to load the roster chart. Please try again. || Tidak dapat memuat grafik roster. Silakan coba lagi. || 无法加载名单图表，请重试。
Dragonite Collectors per alliance group (lowest power first). Recommended 5–{0}: || Pengumpul Dragonite per kelompok aliansi (urutkan dari kekuatan terendah). Disarankan 5–{0}: || 每个联盟组的 Dragonite 收集者（按战力从低到高）。建议 5–{0}：
Re-arrange Dragonite Collectors? || Atur ulang Pengumpul Dragonite? || 重新安排 Dragonite 收集者？
Lock roster || Kunci roster || 锁定名单
Unlock roster || Buka kunci roster || 解锁名单
view only || hanya lihat || 仅查看
Battlefield schedule not set. || Jadwal medan perang belum diatur. || 尚未设置战场日程。
Event phase || Fase acara || 活动阶段
Schedule not set || Jadwal belum diatur || 尚未设置日程
All Alliances ({0}) || Semua Aliansi ({0}) || 所有联盟（{0}）
All Tasks || Semua Tugas || 所有任务
Assign Player || Tetapkan Pemain || 分配玩家
Copy link || Salin tautan || 复制链接
Copy Live Share Foundry link: || Salin tautan Live Share Foundry: || 复制 Foundry 实时分享链接：
Loading Foundry roster… || Memuat roster Foundry… || 正在加载 Foundry 名单…
Unable to load map. Check your connection or Supabase read permissions, then refresh. || Tidak dapat memuat peta. Periksa koneksi atau izin baca Supabase, lalu muat ulang. || 无法加载地图。请检查网络连接或 Supabase 读取权限，然后刷新。
Unable to load chart. Check your connection or Supabase read permissions, then refresh. || Tidak dapat memuat grafik. Periksa koneksi atau izin baca Supabase, lalu muat ulang. || 无法加载图表。请检查网络连接或 Supabase 读取权限，然后刷新。
Small numbers indicate roster slot numbers. || Angka kecil menunjukkan nomor slot roster. || 小数字表示名单位置编号。
Phase || Fase || 阶段
min || menit || 分钟
No players match your search or filter. || Tidak ada pemain yang cocok dengan pencarian atau filter. || 没有玩家符合搜索或筛选条件。
No player data available. || Data pemain tidak tersedia. || 没有可用的玩家数据。
Search nickname... || Cari nama panggilan... || 搜索昵称…
Search nickname or Game ID... || Cari nama panggilan atau Game ID... || 搜索昵称或游戏 ID…
Login to see Troops Power totals. || Masuk untuk melihat total kekuatan pasukan. || 登录以查看部队战力总和。
Snow || Salju || 雪景
Battle Players: || Pemain Battle: || 战斗玩家：
No staff accounts found. || Akun staf tidak ditemukan. || 未找到工作人员账号。
Failed to load accounts: {0} || Gagal memuat akun: {0} || 加载账号失败：{0}
Are you sure you want to delete this player entry? || Yakin ingin menghapus entri pemain ini? || 确定要删除此玩家条目吗？
Move to {0} || Pindahkan ke {0} || 移动到 {0}
Remove this player from the Frostdragon Tyrant roster? || Hapus pemain ini dari roster Frostdragon Tyrant? || 将此玩家从 Frostdragon Tyrant 名单中移除？
Remove this player from Legion roster? || Hapus pemain ini dari roster Legiun? || 将此玩家从军团名单中移除？
Remove {0} selected player(s) from {1}? || Hapus {0} pemain terpilih dari {1}? || 从 {1} 中移除已选的 {0} 名玩家？
Please wait… || Harap tunggu… || 请稍候…
Reset this browser's local snow preference? The global Battle Theme is stored in Supabase and will not be changed. || Atur ulang preferensi salju lokal browser ini? Tema Battle global tersimpan di Supabase dan tidak akan berubah. || 重置此浏览器的本地雪景偏好？全局战斗主题保存在 Supabase 中，不会更改。
Select all shown (until slots are full) || Pilih semua yang tampil (hingga slot penuh) || 全选当前显示项（直到位置满员）
Assign Selected || Tetapkan yang Dipilih || 分配所选玩家
Search Game ID / Nickname || Cari Game ID / Nama panggilan || 搜索游戏 ID / 昵称
Type game ID or nickname... || Ketik Game ID atau nama panggilan... || 输入游戏 ID 或昵称…
Bulk Assign Foundry || Penugasan Massal Foundry || Foundry 批量分配
The selected players fill the next free slots, ordered from highest Power. || Pemain terpilih mengisi slot kosong berikutnya, diurutkan dari Power tertinggi. || 所选玩家按战力从高到低填入下一个空位。
No Commander assigned. || Commander belum ditetapkan. || 尚未分配指挥官。
No Rally Leader to attack the Imperial Foundry. || Belum ada Rally Leader untuk menyerang Imperial Foundry. || 尚未分配集结队长攻击帝国铸造厂。
Battle || Pertempuran || 战斗
Substitute || Cadangan || 替补
Foundry Live Map || Peta Live Foundry || Foundry 实时地图
Foundry Live Chart || Grafik Live Foundry || Foundry 实时图表
FDT Roster Chart || Grafik Roster FDT || FDT 名单图表


# Buttons, pages, roster, events, account and status messages
Select an option below || Pilih salah satu opsi di bawah || 请选择以下选项
Minister Reservation || Reservasi Menteri || 部长预约
Events Leaderboard Record || Rekor Papan Peringkat Acara || 活动排行榜记录
Transfer Portal || Portal Transfer || 转服门户
Battle Events || Acara Pertempuran || 战斗活动
WoS Tool || Alat WoS || WoS 工具
Current President || Presiden Saat Ini || 当前总统
RECENTLY ACCEPTED RESERVATION || RESERVASI YANG BARU DITERIMA || 最近接受的预约
No recent activity || Belum ada aktivitas terbaru || 暂无最近活动
Made With ❤️ By: || Dibuat dengan ❤️ oleh: || 制作：❤️
Menu || Menu || 菜单
Choose language || Pilih bahasa || 选择语言
Back to Menu || Kembali ke Menu || 返回菜单
Back || Kembali || 返回
Next || Berikutnya || 下一步
Previous || Sebelumnya || 上一步
Open || Buka || 打开
Close || Tutup || 关闭
Enable || Aktifkan || 启用
Disable || Nonaktifkan || 禁用
Copy || Salin || 复制
Copied! || Berhasil disalin! || 已复制！
Copy link || Salin tautan || 复制链接
Download || Unduh || 下载
Upload || Unggah || 上传
Choose file || Pilih berkas || 选择文件
Select all || Pilih semua || 全选
Clear all || Kosongkan semua || 清空全部
Clear roster || Kosongkan roster || 清空名单
Save changes || Simpan perubahan || 保存更改
Discard changes || Buang perubahan || 放弃更改
Are you sure? || Apakah Anda yakin? || 确定吗？
Please try again. || Silakan coba lagi. || 请重试。
Something went wrong. || Terjadi kesalahan. || 出现错误。
Success || Berhasil || 成功
Error || Kesalahan || 错误
Warning || Peringatan || 警告
Information || Informasi || 信息
No results found || Tidak ada hasil || 未找到结果
No players found || Pemain tidak ditemukan || 未找到玩家
No events found || Acara tidak ditemukan || 未找到活动
No schedule set || Jadwal belum diatur || 尚未设置日程
Battle schedule || Jadwal pertempuran || 战斗日程
Match time || Waktu pertandingan || 比赛时间
Time slot (UTC+0) || Slot waktu (UTC+0) || 时段（UTC+0）
Preferred time || Waktu pilihan || 首选时间
Waiting List || Daftar Tunggu || 等待名单
Applicants || Pendaftar || 申请者
Accepted Slots || Slot yang Diterima || 已接受时段
Slots Left || Slot Tersisa || 剩余时段
Total Applicants || Total Pendaftar || 申请总数
Accept || Terima || 接受
Reject || Tolak || 拒绝
Move || Pindahkan || 移动
Move to time || Pindahkan ke waktu || 移动到指定时间
Remove player || Hapus pemain || 移除玩家
Add player || Tambah pemain || 添加玩家
Player name || Nama pemain || 玩家名称
RANK || PERINGKAT || 排名
Rank || Peringkat || 排名
ALLIANCE || ALIANSI || 联盟
Alliance || Aliansi || 联盟
NICKNAME || NAMA PANGGILAN || 昵称
GAME ID || ID GAME || 游戏 ID
TROOPS POWER || KEKUATAN PASUKAN || 部队战力
PREF. TIME || WAKTU PILIHAN || 首选时间
STATUS || STATUS || 状态
ACTION || AKSI || 操作
Nickname || Nama panggilan || 昵称
Game ID || ID Game || 游戏 ID
Alliance name || Nama aliansi || 联盟名称
Alliance code || Kode aliansi || 联盟代码
Troops Power || Kekuatan Pasukan || 部队战力
Total Troops Power || Total Kekuatan Pasukan || 部队总战力
Hero Power || Kekuatan Hero || 英雄战力
Total Hero Power || Total Kekuatan Hero || 英雄总战力
Battle Power || Kekuatan Tempur || 战斗力
Roster || Daftar pemain || 名单
Battle roster || Daftar pemain pertempuran || 战斗名单
Slot number || Nomor slot || 位置编号
Slot || Slot || 位置
Commander || Komandan || 指挥官
Rally Leader || Pemimpin Rally || 集结队长
Task assignment || Penugasan tugas || 任务分配
Select Legion and Phase || Pilih Legion dan Fase || 选择军团和阶段
All Legions || Semua Legion || 所有军团
All Phases || Semua fase || 所有阶段
Phase 1 || Fase 1 || 第一阶段
Phase 2 || Fase 2 || 第二阶段
Phase 3 || Fase 3 || 第三阶段
Task assignment saved. || Penugasan tugas disimpan. || 任务分配已保存。
Save failed. || Gagal menyimpan. || 保存失败。
Loading latest data... || Memuat data terbaru... || 正在加载最新数据…
Loading accounts... || Memuat akun... || 正在加载账号…
Loading roster chart… || Memuat grafik roster… || 正在加载名单图表…
Loading Foundry roster… || Memuat roster Foundry… || 正在加载 Foundry 名单…
All troops power global rank || Peringkat global kekuatan seluruh pasukan || 全部部队战力全球排名
ALL TROOPS POWER (GLOBAL RANK) || KEKUATAN SELURUH PASUKAN (PERINGKAT GLOBAL) || 全部部队战力（全球排名）
Bulk Assign || Penugasan Massal || 批量分配
Auto-fill (by Power) || Isi Otomatis (berdasarkan Kekuatan) || 自动填充（按战力）
Copy for Discord || Salin untuk Discord || 复制到 Discord
Clear Roster || Kosongkan Roster || 清空名单
Frostdragon Tyrant || Frostdragon Tyrant || Frostdragon Tyrant
Live Map || Peta Langsung || 实时地图
Share || Bagikan || 分享
Strategy Guide || Panduan Strategi || 战略指南
Checklist || Daftar Periksa || 检查清单
Pre-battle checklist || Daftar periksa sebelum pertempuran || 战前检查清单
Search... || Cari... || 搜索...
Filter || Filter || 筛选
Sort by || Urutkan berdasarkan || 排序方式
Ascending || Menaik || 升序
Descending || Menurun || 降序
Status || Status || 状态
Active || Aktif || 活跃
Inactive || Tidak aktif || 未启用
Pending || Menunggu || 待处理
Completed || Selesai || 已完成
Failed || Gagal || 失败
Not available || Tidak tersedia || 不可用
Permission denied || Izin ditolak || 权限不足
Check your connection and try again. || Periksa koneksi Anda lalu coba lagi. || 请检查网络连接后重试。


# President info and redeem code help
Edit President Info || Edit Info Presiden || 编辑会长信息
This updates the footer shown to everyone. || Informasi ini memperbarui footer yang ditampilkan kepada semua orang. || 此处更新的信息将显示在所有人看到的页脚中。
President Name || Nama Presiden || 会长名称
Guild Name || Nama Guild || 公会名称
One Player ID per line to redeem for multiple accounts at once, or pick an alliance above to auto-fill every ID in that alliance. || Masukkan satu Player ID per baris untuk menukarkan kode bagi beberapa akun sekaligus, atau pilih aliansi di atas untuk mengisi otomatis semua ID dalam aliansi tersebut. || 每行输入一个玩家 ID，即可同时为多个账号兑换；也可以选择上方的联盟，自动填入该联盟的所有 ID。

# Legion roster and administration
Login || Masuk || 登录
Logout || Keluar || 退出登录
Logout (DEMON) || Keluar (DEMON) || 退出登录（DEMON）
Redeem Code || Tukarkan Kode || 兑换码
Assign Player to Legion || Tetapkan Pemain ke Legiun || 将玩家分配至军团
Bulk Remove || Hapus Massal || 批量移除
Export CSV || Ekspor CSV || 导出 CSV
Legion 1 Official Roster || Daftar Resmi Legiun 1 || 第一军团官方名单
Official Roster || Daftar Resmi || 官方名单
Troops Power Leaderboard || Papan Peringkat Kekuatan Pasukan || 部队战力排行榜
FULL ACCESS STAFF || STAF AKSES PENUH || 完全权限工作人员
Substitute Players: || Pemain Cadangan: || 替补玩家：
TOP 20 TROOPS POWER || 20 Kekuatan Pasukan Teratas || 部队战力前 20 名
BATTLE TROOPS POWER || Kekuatan Pasukan Tempur || 战斗部队战力
SUBSTITUTE TROOPS POWER || Kekuatan Pasukan Cadangan || 替补部队战力
Last updated: {0} || Terakhir diperbarui: {0} || 最后更新：{0}
RANK || PERINGKAT || 排名
ALLIANCE || ALIANSI || 联盟
NICKNAME || NAMA PANGGILAN || 昵称
GAME ID || ID GAME || 游戏 ID
TROOPS POWER || KEKUATAN PASUKAN || 部队战力
PREF. TIME || WAKTU PILIHAN || 首选时间
Local Time: || Waktu Lokal: || 本地时间：
UTC-0: || UTC-0: || UTC-0：
Language / Bahasa / 语言 || Bahasa || 语言
Snow ON || Salju Aktif || 雪景开启
Snow OFF || Salju Nonaktif || 雪景关闭
President Panel || Panel Presiden || 会长面板
Current President || Presiden Saat Ini || 当前会长
No recent activity || Belum ada aktivitas terbaru || 暂无最近活动
Search nickname or Game ID... || Cari nama panggilan atau ID Game... || 搜索昵称或游戏 ID…


# President Panel — complete interface labels
FULL ACCESS CONTROL CENTER || PUSAT KENDALI AKSES PENUH || 完整权限控制中心
Central control for the five alliances, player roster, battle and system settings. || Pusat kendali untuk lima aliansi, daftar pemain, pertempuran, dan pengaturan sistem. || 五个联盟、玩家名单、战斗和系统设置的中央控制台。
Back || Kembali || 返回
Refresh || Muat ulang || 刷新
Total Players || Total Pemain || 玩家总数
Battle || Tempur || 战斗
Substitute || Cadangan || 替补
Active Theme || Tema Aktif || 当前主题
Battle Theme || Tema Pertempuran || 战斗主题
Choose the battle mode for the whole site. This is global: every visitor and staff member sees the change. || Pilih mode pertempuran untuk seluruh situs. Pengaturan ini berlaku global bagi semua pengunjung dan staf. || 为整个网站选择战斗模式。此设置为全局设置，所有访客和工作人员都会看到更改。
ACTIVE || AKTIF || 已启用
2 Legions · each 30 Battle + 20 Substitute || 2 Legiun · masing-masing 30 Tempur + 20 Cadangan || 2 个军团 · 每个军团 30 名战斗成员 + 20 名替补
1 Battle Group · up to 60 per alliance · No Substitute || 1 Grup Tempur · maksimal 60 per aliansi · Tanpa Cadangan || 1 个战斗组 · 每个联盟最多 60 人 · 无替补
Player data, alliances and leaderboards stay intact. Each theme keeps its own roster, so switching never overwrites the other. || Data pemain, aliansi, dan papan peringkat tetap utuh. Setiap tema memiliki roster sendiri sehingga pergantian tema tidak menimpa data tema lain. || 玩家数据、联盟和排行榜都会保留。每个主题使用独立名单，切换主题不会覆盖另一个主题的数据。
Player Management || Pengelolaan Pemain || 玩家管理
Open the existing player database and manage all five alliances. || Buka basis data pemain yang ada dan kelola kelima aliansi. || 打开现有玩家数据库并管理全部五个联盟。
Battle / Legion Management || Pengelolaan Pertempuran / Legiun || 战斗 / 军团管理
Manage the existing Legion rosters and player assignments. || Kelola roster Legiun dan penempatan pemain yang sudah ada. || 管理现有军团名单和玩家分配。
Open Battle 1 || Buka Pertempuran 1 || 打开战斗 1
Open Battle 2 || Buka Pertempuran 2 || 打开战斗 2
Global Leaderboard || Papan Peringkat Global || 全球排行榜
View the complete Troops Power ranking across ARX, IDN, VNX, ZXC and CAT. || Lihat peringkat Kekuatan Pasukan lengkap untuk ARX, IDN, VNX, ZXC, dan CAT. || 查看 ARX、IDN、VNX、ZXC 和 CAT 的完整部队战力排名。
Open Global Ranking || Buka Peringkat Global || 打开全球排名
Battle Schedule || Jadwal Pertempuran || 战斗日程
Use the existing schedule system for the active Battle group(s). || Gunakan sistem jadwal yang tersedia untuk grup pertempuran aktif. || 使用现有日程系统管理当前启用的战斗组。
Schedule 1 || Jadwal 1 || 日程 1
Schedule 2 || Jadwal 2 || 日程 2
President Panel is available to full-access staff only. || Panel Presiden hanya tersedia untuk staf dengan akses penuh. || 会长面板仅向拥有完整权限的工作人员开放。
President Panel data refreshed. || Data Panel Presiden berhasil diperbarui. || 会长面板数据已刷新。
Choose language || Pilih bahasa || 选择语言
Toggle snow effect || Aktifkan/nonaktifkan efek salju || 切换飘雪效果
LOCAL: || LOKAL: || 本地时间：

# FDT Guide — complete EN / ID / Simplified Chinese translations
FDT Guide || Panduan FDT || FDT 指南
Battle preparation, assignments and phase-by-phase reminders. || Persiapan pertempuran, pembagian tugas, dan pengingat untuk setiap fase. || 战斗准备、任务分配和各阶段提醒。
Close FDT Guide || Tutup Panduan FDT || 关闭 FDT 指南
1. Before battle || 1. Sebelum pertempuran || 1. 战斗前
Sign-up (48h): the Alliance Leader or an R4 registers. Only a limited number of top alliances per Zone qualify. || Pendaftaran (48 jam): Pemimpin Aliansi atau anggota R4 mendaftarkan aliansi. Hanya sejumlah terbatas aliansi teratas di setiap Zona yang memenuhi syarat. || 报名（48小时）：由联盟首领或 R4 成员报名。每个区域只有有限数量的顶级联盟符合资格。
Members must already be in the alliance before sign-up ends, or they cannot be dispatched. || Anggota harus sudah bergabung dengan aliansi sebelum pendaftaran berakhir; jika tidak, mereka tidak dapat dikirim ke pertempuran. || 成员必须在报名结束前加入联盟，否则无法被派遣。
Dispatch (48h): R4/R5 select up to 60 combatants per alliance. Players not dispatched can still help by healing troops. || Penugasan (48 jam): R4/R5 memilih hingga 60 petarung per aliansi. Pemain yang tidak ditugaskan tetap dapat membantu dengan menyembuhkan pasukan. || 派遣（48小时）：R4/R5 每个联盟最多选择 60 名战斗成员。未被派遣的玩家仍可通过治疗部队提供帮助。
Eve of Battle (59h): finalize the Tyrant candidate, Rally Captains, Spire teams, Dragonite collectors and communication calls. || Menjelang Pertempuran (59 jam): tetapkan kandidat Tyrant, Rally Captain, tim Spire, pengumpul Dragonite, dan komando komunikasi. || 战斗前夕（59小时）：确定 Tyrant 候选人、集结队长、尖塔队伍、Dragonite 采集者和通讯指令。
2. Battle timeline || 2. Linimasa pertempuran || 2. 战斗时间线
Battlefield is open for 7 hours. Cities start in the Border Region. || Medan pertempuran terbuka selama 7 jam. Kota-kota memulai pertempuran di Wilayah Perbatasan. || 战场开放 7 小时。城市从边境区域开始。
The Capital becomes vulnerable 1 hour after opening, leaving a 6-hour Capital battle. || Ibu Kota mulai dapat diserang 1 jam setelah medan dibuka, sehingga pertempuran di Ibu Kota berlangsung selama 6 jam. || 战场开放 1 小时后，首都进入可攻击状态，首都争夺战持续 6 小时。
Frostdragon Escorts appear in the Border Region when the Capital opens and refresh every 30 minutes. || Frostdragon Escort muncul di Wilayah Perbatasan saat Ibu Kota terbuka dan muncul kembali setiap 30 menit. || 首都开放时，冰霜巨龙护卫会在边境区域出现，并每 30 分钟刷新一次。
Dragonite gathering appears 15 minutes after the Capital opens and also refreshes every 30 minutes. || Pengumpulan Dragonite dimulai 15 menit setelah Ibu Kota terbuka dan diperbarui setiap 30 menit. || 首都开放 15 分钟后开始采集 Dragonite，此后每 30 分钟刷新一次。
Spires alternate 30 minutes vulnerable and 30 minutes protected. || Spire bergantian berada dalam kondisi dapat diserang selama 30 menit dan terlindungi selama 30 menit. || 尖塔每 30 分钟在可攻击和受保护状态之间交替。
Rearmament follows the battle for 55 hours: +500% Healing Speed and -30% Healing Costs. || Fase Rearmament berlangsung selama 55 jam setelah pertempuran: Kecepatan Penyembuhan +500% dan Biaya Penyembuhan -30%. || 战斗结束后进入 55 小时的整备阶段：治疗速度 +500%，治疗费用 -30%。
3. Spires (30-minute alliance buff) || 3. Spire (buff aliansi selama 30 menit) || 3. 尖塔（联盟增益持续 30 分钟）
Life Spire: +20% Troop Health. Shield Spire: +20% Troop Defense. Dragonbane Spire: +20% Troop Lethality. Blade Spire: +20% Troop Attack. The alliance that dominates a Spire during its vulnerable period gets the buff for 30 minutes. || Life Spire: Kesehatan Pasukan +20%. Shield Spire: Pertahanan Pasukan +20%. Dragonbane Spire: Daya Mematikan Pasukan +20%. Blade Spire: Serangan Pasukan +20%. Aliansi yang menguasai Spire selama periode rentannya memperoleh buff selama 30 menit. || 生命尖塔：部队生命值 +20%。护盾尖塔：部队防御 +20%。屠龙尖塔：部队杀伤力 +20%。刀锋尖塔：部队攻击 +20%。在尖塔可被攻击期间占领它的联盟可获得持续 30 分钟的增益。
4. Becoming Frostdragon Tyrant || 4. Menjadi Frostdragon Tyrant || 4. 成为冰霜巨龙 Tyrant
The Chief with the longest total Capital occupation time wins; on a tie, whoever reached that time first. || Chief dengan total waktu menduduki Ibu Kota paling lama akan menang; jika seri, pemenangnya adalah yang lebih dahulu mencapai waktu tersebut. || 首都累计占领时间最长的 Chief 获胜；若时间相同，则由先达到该时间者获胜。
Only the Rally Captain accumulates occupation time, reinforcers do not, so pick one candidate and avoid unnecessary captain changes. Tyrant privileges last 30 days. || Hanya Rally Captain yang mengumpulkan waktu pendudukan; pemain yang memperkuat tidak mendapatkannya. Karena itu, pilih satu kandidat dan hindari pergantian kapten yang tidak perlu. Hak istimewa Tyrant berlangsung selama 30 hari. || 只有集结队长会累计占领时间，增援者不会累计。因此请选定一名候选人，避免不必要地更换队长。Tyrant 特权持续 30 天。
5. Common mistakes || 5. Kesalahan umum || 5. 常见错误
Rotating random Rally Captains, which splits occupation time. || Terus mengganti Rally Captain secara acak sehingga waktu pendudukan terbagi. || 随意轮换集结队长，导致占领时间被分散。
Ignoring Spires or leaving Capital Defense uncovered. || Mengabaikan Spire atau membiarkan pertahanan Ibu Kota tanpa penjagaan. || 忽视尖塔，或让首都防守出现空缺。
Not assigning anyone to Dragonite gathering and its 30-minute refresh. || Tidak menugaskan pemain untuk mengumpulkan Dragonite dan memantau penyegarannya setiap 30 menit. || 没有安排人员采集 Dragonite，也没有跟进每 30 分钟的刷新。
Staying in the Dragon Crypt expecting a Shield: Shields are removed there and cannot be activated. || Tetap berada di Dragon Crypt dengan berharap mendapatkan Shield: Shield akan dihapus di sana dan tidak dapat diaktifkan. || 留在龙之秘窟中期待获得护盾：护盾会在此处被移除，无法启用。
Spending all healing resources before Rearmament. || Menghabiskan semua sumber daya penyembuhan sebelum fase Rearmament. || 在整备阶段开始前耗尽所有治疗资源。
6. Personal points || 6. Poin pribadi || 6. 个人积分
Personal Points come from Carnage Points (severely injuring enemy troops) and Casualty Points (your troops severely injured) in Capital and Spire battles. Sitting in a building without fighting does not earn points. || Poin Pribadi berasal dari Carnage Points (melukai pasukan musuh secara parah) dan Casualty Points (pasukan sendiri yang terluka parah) dalam pertempuran di Ibu Kota dan Spire. Berdiam di bangunan tanpa bertempur tidak menghasilkan poin. || 个人积分来自首都和尖塔战斗中的杀戮积分（重创敌方部队）和伤亡积分（己方部队严重受伤）。仅驻守建筑而不战斗不会获得积分。
7. Task duties || 7. Tugas setiap peran || 7. 各项任务职责
Every Battle player has one group task (Alliance A or B) plus one or more role tasks. Check your task on the roster before the Eve of Battle and follow your group leader's calls. || Setiap pemain Battle memiliki satu tugas kelompok (Alliance A atau B) serta satu atau lebih tugas peran. Periksa tugas pada roster sebelum Menjelang Pertempuran dan ikuti arahan pemimpin kelompok. || 每位战斗成员都有一个分组任务（联盟 A 或 B）以及一个或多个角色任务。请在战斗前夕前查看名单中的任务，并听从小组负责人的指挥。
Rally Captain || Kapten Rally || 集结队长
starts and leads the Capital rallies and is the only one who accumulates occupation time. Stay on the Capital, keep the garrison full, and do not hand over the captain role unless the leader calls it. || memulai dan memimpin rally ke Ibu Kota serta menjadi satu-satunya yang mengumpulkan waktu pendudukan. Tetap di Ibu Kota, jaga garnisun tetap penuh, dan jangan menyerahkan peran kapten kecuali diperintahkan pemimpin. || 发起并带领首都集结，也是唯一累计占领时间的角色。留守首都并保持驻军充足，除非负责人指示，否则不要交接队长职位。
Tyrant Candidate || Kandidat Tyrant || Tyrant 候选人
The Chief the alliance is backing to become Frostdragon Tyrant. Hold the Capital as Rally Captain for as long as possible, avoid unnecessary captain changes, and keep your troops healed. || Chief yang didukung aliansi untuk menjadi Frostdragon Tyrant. Kuasai Ibu Kota sebagai Rally Captain selama mungkin, hindari pergantian kapten yang tidak perlu, dan jaga pasukan tetap pulih. || 联盟支持其成为冰霜巨龙 Tyrant 的 Chief。尽可能长时间担任集结队长并占领首都，避免不必要的队长更换，并保持部队状态良好。
Capital Reinforcer || Penguat Ibu Kota || 首都增援者
send your troops into the Rally Captain's Capital garrison and keep them there. Refill the garrison right after losses and do not leave the Capital while the captain is holding it. || kirim pasukan ke garnisun Ibu Kota milik Rally Captain dan tetap di sana. Isi kembali garnisun segera setelah ada korban dan jangan meninggalkan Ibu Kota selama kapten mempertahankannya. || 将部队派入集结队长的首都驻军并留守。出现损失后立即补充驻军，队长守住首都期间不要离开。
Capital Defense || Pertahanan Ibu Kota || 首都防守
protect the Capital against enemy rallies and attacks. Stay close to the Capital, join defensive reinforcements when the captain is under pressure, and make sure the Capital is never left uncovered. || lindungi Ibu Kota dari rally dan serangan musuh. Tetap dekat Ibu Kota, bantu penguatan pertahanan saat kapten tertekan, dan pastikan Ibu Kota tidak pernah tanpa penjagaan. || 防御敌方集结和攻击。靠近首都，队长承压时加入防守增援，并确保首都始终有人防守。
Spire Life || Spire Kehidupan || 生命尖塔
 take and hold the Life Spire (+20% Troop Health) during its 30-minute vulnerable window. Coordinate with your group so the buff is secured as soon as the window opens. || rebut dan pertahankan Life Spire (+20% Kesehatan Pasukan) selama periode 30 menit saat dapat diserang. Koordinasikan dengan kelompok agar buff diamankan segera setelah periode terbuka. || 在 30 分钟可攻击窗口内夺取并守住生命尖塔（部队生命值 +20%）。与小组协调，在窗口开启后尽快获得增益。
Spire Shield || Spire Perisai || 护盾尖塔
 take and hold the Shield Spire (+20% Troop Defense) during its vulnerable window, and keep enough troops there to stop the enemy from retaking it. || rebut dan pertahankan Shield Spire (+20% Pertahanan Pasukan) selama periode rentan, dan tempatkan pasukan yang cukup agar musuh tidak merebutnya kembali. || 在可攻击窗口内夺取并守住护盾尖塔（部队防御 +20%），并部署足够部队防止敌人夺回。
Spire Dragonbane || Spire Pembasmi Naga || 屠龙尖塔
take and hold the Dragonbane Spire (+20% Troop Lethality) during its vulnerable window. Move on to the next objective once the window closes. || rebut dan pertahankan Dragonbane Spire (+20% Daya Mematikan Pasukan) selama periode rentan. Beralih ke sasaran berikutnya setelah periode berakhir. || 在可攻击窗口内夺取并守住屠龙尖塔（部队杀伤力 +20%）。窗口结束后转向下一个目标。
Spire Blade || Spire Pedang || 刀锋尖塔
take and hold the Blade Spire (+20% Troop Attack) during its vulnerable window, and rally or reinforce as needed to keep it. || rebut dan pertahankan Blade Spire (+20% Serangan Pasukan) selama periode rentan, lalu lakukan rally atau penguatan bila diperlukan. || 在可攻击窗口内夺取并守住刀锋尖塔（部队攻击 +20%），并根据需要集结或增援以守住它。
Dragonite Collector || Pengumpul Dragonite || Dragonite 采集者
gather Dragonite as soon as it appears (15 minutes after the Capital opens) and check again at every 30-minute refresh. Escort or hide gatherers if enemies are nearby. Collectors are the lowest-power players and multitask: until Dragonite opens (75 minutes after the Battlefield opens) they carry out their other duty, usually Capital Reinforcer. || kumpulkan Dragonite segera setelah muncul (15 menit setelah Ibu Kota terbuka) dan periksa kembali setiap 30 menit saat diperbarui. Kawal atau sembunyikan pengumpul jika musuh berada di dekatnya. Pengumpul biasanya pemain dengan kekuatan terendah dan menjalankan tugas ganda: sebelum Dragonite terbuka (75 menit setelah medan pertempuran dibuka), mereka menjalankan tugas lain, biasanya sebagai Penguat Ibu Kota. || Dragonite 出现后立即采集（首都开放 15 分钟后），并在每次 30 分钟刷新时再次查看。附近有敌人时护送或隐藏采集者。采集者通常是战力较低的玩家，需要兼顾其他任务：Dragonite 开放前（战场开放 75 分钟后）执行其他职责，通常担任首都增援者。
Alliance A / Alliance B || Aliansi A / Aliansi B || 联盟 A / 联盟 B
your battle group. Players join the Capital, Spires and Dragonite calls of their own group. A player belongs to only one group. || kelompok pertempuran Anda. Pemain mengikuti panggilan untuk Ibu Kota, Spire, dan Dragonite dari kelompoknya sendiri. Setiap pemain hanya boleh tergabung dalam satu kelompok. || 你的战斗小组。玩家应响应所属小组关于首都、尖塔和 Dragonite 的指令。每位玩家只能属于一个小组。

The Chief with the longest total Capital occupation time wins; on a tie, whoever reached that time first. Only the Rally Captain accumulates occupation time, reinforcers do not, so pick one candidate and avoid unnecessary captain changes. Tyrant privileges last 30 days. || Chief dengan total waktu menduduki Ibu Kota paling lama akan menang; jika seri, pemenangnya adalah yang lebih dahulu mencapai waktu tersebut. Hanya Rally Captain yang mengumpulkan waktu pendudukan, bukan pemain penguat. Pilih satu kandidat dan hindari pergantian kapten yang tidak perlu. Hak istimewa Tyrant berlangsung selama 30 hari. || 首都累计占领时间最长的 Chief 获胜；若时间相同，则由先达到该时间者获胜。只有集结队长会累计占领时间，增援者不会。请选定一名候选人，避免不必要地更换队长。Tyrant 特权持续 30 天。
: starts and leads the Capital rallies and is the only one who accumulates occupation time. Stay on the Capital, keep the garrison full, and do not hand over the captain role unless the leader calls it. || memulai dan memimpin rally ke Ibu Kota serta menjadi satu-satunya yang mengumpulkan waktu pendudukan. Tetap di Ibu Kota, jaga garnisun tetap penuh, dan jangan menyerahkan peran kapten kecuali diperintahkan pemimpin. || 发起并带领首都集结，也是唯一累计占领时间的角色。留守首都并保持驻军充足，除非负责人指示，否则不要交接队长职位。
: the Chief the alliance is backing to become Frostdragon Tyrant. Hold the Capital as Rally Captain for as long as possible, avoid unnecessary captain changes, and keep your troops healed. || Chief yang didukung aliansi untuk menjadi Frostdragon Tyrant. Kuasai Ibu Kota sebagai Rally Captain selama mungkin, hindari pergantian kapten yang tidak perlu, dan jaga pasukan tetap pulih. || 联盟支持其成为冰霜巨龙 Tyrant 的 Chief。尽可能长时间担任集结队长并占领首都，避免不必要的队长更换，并保持部队状态良好。
: send your troops into the Rally Captain's Capital garrison and keep them there. Refill the garrison right after losses and do not leave the Capital while the captain is holding it. || kirim pasukan ke garnisun Ibu Kota milik Rally Captain dan tetap di sana. Isi kembali garnisun segera setelah ada korban dan jangan meninggalkan Ibu Kota selama kapten mempertahankannya. || 将部队派入集结队长的首都驻军并留守。出现损失后立即补充驻军，队长守住首都期间不要离开。
: protect the Capital against enemy rallies and attacks. Stay close to the Capital, join defensive reinforcements when the captain is under pressure, and make sure the Capital is never left uncovered. || lindungi Ibu Kota dari rally dan serangan musuh. Tetap dekat Ibu Kota, bantu penguatan pertahanan saat kapten tertekan, dan pastikan Ibu Kota tidak pernah tanpa penjagaan. || 防御敌方集结和攻击。靠近首都，队长承压时加入防守增援，并确保首都始终有人防守。
: take and hold the Life Spire (+20% Troop Health) during its 30-minute vulnerable window. Coordinate with your group so the buff is secured as soon as the window opens. || rebut dan pertahankan Life Spire (+20% Kesehatan Pasukan) selama periode 30 menit saat dapat diserang. Koordinasikan dengan kelompok agar buff diamankan segera setelah periode terbuka. || 在 30 分钟可攻击窗口内夺取并守住生命尖塔（部队生命值 +20%）。与小组协调，在窗口开启后尽快获得增益。
: take and hold the Shield Spire (+20% Troop Defense) during its vulnerable window, and keep enough troops there to stop the enemy from retaking it. || rebut dan pertahankan Shield Spire (+20% Pertahanan Pasukan) selama periode rentan, dan tempatkan pasukan yang cukup agar musuh tidak merebutnya kembali. || 在可攻击窗口内夺取并守住护盾尖塔（部队防御 +20%），并部署足够部队防止敌人夺回。
: take and hold the Dragonbane Spire (+20% Troop Lethality) during its vulnerable window. Move on to the next objective once the window closes. || rebut dan pertahankan Dragonbane Spire (+20% Daya Mematikan Pasukan) selama periode rentan. Beralih ke sasaran berikutnya setelah periode berakhir. || 在可攻击窗口内夺取并守住屠龙尖塔（部队杀伤力 +20%）。窗口结束后转向下一个目标。
: take and hold the Blade Spire (+20% Troop Attack) during its vulnerable window, and rally or reinforce as needed to keep it. || rebut dan pertahankan Blade Spire (+20% Serangan Pasukan) selama periode rentan, lalu lakukan rally atau penguatan bila diperlukan. || 在可攻击窗口内夺取并守住刀锋尖塔（部队攻击 +20%），并根据需要集结或增援以守住它。
: gather Dragonite as soon as it appears (15 minutes after the Capital opens) and check again at every 30-minute refresh. Escort or hide gatherers if enemies are nearby. Collectors are the lowest-power players and multitask: until Dragonite opens (75 minutes after the Battlefield opens) they carry out their other duty, usually Capital Reinforcer. || kumpulkan Dragonite segera setelah muncul (15 menit setelah Ibu Kota terbuka) dan periksa kembali setiap 30 menit saat diperbarui. Kawal atau sembunyikan pengumpul jika musuh berada di dekatnya. Pengumpul biasanya pemain dengan kekuatan terendah dan menjalankan tugas ganda: sebelum Dragonite terbuka (75 menit setelah medan pertempuran dibuka), mereka menjalankan tugas lain, biasanya sebagai Penguat Ibu Kota. || Dragonite 出现后立即采集（首都开放 15 分钟后），并在每次 30 分钟刷新时再次查看。附近有敌人时护送或隐藏采集者。采集者通常是战力较低的玩家，需要兼顾其他任务：Dragonite 开放前（战场开放 75 分钟后）执行其他职责，通常担任首都增援者。
: your battle group. Players join the Capital, Spires and Dragonite calls of their own group. A player belongs to only one group. || kelompok pertempuran Anda. Pemain mengikuti panggilan untuk Ibu Kota, Spire, dan Dragonite dari kelompoknya sendiri. Setiap pemain hanya boleh tergabung dalam satu kelompok. || 你的战斗小组。玩家应响应所属小组关于首都、尖塔和 Dragonite 的指令。每位玩家只能属于一个小组。

Tip: verify event-specific mechanics in-game before battle. || Tips: periksa mekanisme khusus event di dalam game sebelum bertempur. || 提示：战斗前请在游戏内确认该活动的具体机制。
Close guide || Tutup panduan || 关闭指南

# Home page subtitle and view controls
Select Alliance, Global Leaderboard, or Legion Roster || Pilih Aliansi, Papan Peringkat Global, atau Roster Legiun || 选择联盟、全球排行榜或军团名单
Select Alliance, Global Leaderboard, or Battle Group || Pilih Aliansi, Papan Peringkat Global, atau Grup Pertempuran || 选择联盟、全球排行榜或战斗小组
Select Alliance || Pilih Aliansi || 选择联盟
All Phase || Semua Fase || 所有阶段
All Phases || Semua Fase || 所有阶段
Map || Peta || 地图
Chart || Grafik || 图表

# Alliance names: preserve alliance codes, translate the word Alliance
ARX Alliance || Aliansi ARX || ARX 联盟
IDN Alliance || Aliansi IDN || IDN 联盟
VNX Alliance || Aliansi VNX || VNX 联盟
ZXC Alliance || Aliansi ZXC || ZXC 联盟
CAT Alliance || Aliansi CAT || CAT 联盟
ALL TROOPS POWER (GLOBAL RANK) || KEKUATAN SELURUH PASUKAN (PERINGKAT GLOBAL) || 全部部队战力（全球排名）
Select Alliance, Global Leaderboard, or Legion Roster || Pilih Aliansi, Papan Peringkat Global, atau Roster Legiun || 选择联盟、全球排行榜或军团名单
Select Alliance, Global Leaderboard, or Battle Group || Pilih Aliansi, Papan Peringkat Global, atau Grup Pertempuran || 选择联盟、全球排行榜或战斗小组
All Phase || Semua Fase || 所有阶段
All Phases || Semua Fase || 所有阶段
Set Schedule || Atur Jadwal || 设置日程
Match Time: Sunday, 12:00 UTC || Waktu Pertandingan: Minggu, 12:00 UTC || 比赛时间：星期日 UTC 12:00
Match Time: 12:00 UTC || Waktu Pertandingan: 12:00 UTC || 比赛时间：UTC 12:00
Select Day || Pilih Hari || 选择日期
Select Match Time || Pilih Waktu Pertandingan || 选择比赛时间
Select Preferred Time || Pilih Waktu Pilihan || 选择首选时间
FDT Guide || Panduan FDT || FDT 指南
Foundry Battle Roster (IDN) || Roster Pertempuran Foundry (IDN) || Foundry 战斗名单（IDN）


# Input placeholders and field labels
Search nickname or Game ID... || Cari nickname atau ID Game... || 搜索昵称或游戏 ID...
Enter president name || Masukkan nama presiden || 输入会长名称
Enter guild name || Masukkan nama guild || 输入公会名称
Enter nickname || Masukkan nickname || 输入昵称
Enter Game ID || Masukkan ID Game || 输入游戏 ID
e.g. 150000000 || mis. 150000000 || 例如 150000000
Type game ID or nickname... || Ketik ID Game atau nickname... || 输入游戏 ID 或昵称...
Min. 6 characters || Minimal 6 karakter || 至少 6 个字符
Enter username || Masukkan nama pengguna || 输入用户名
Enter password || Masukkan kata sandi || 输入密码
Enter gift code || Masukkan kode hadiah || 输入礼包码
Player ID (FID) || ID Pemain (FID) || 玩家 ID（FID）
Gift Code || Kode Hadiah || 礼包码
Select all shown || Pilih semua yang ditampilkan || 全选当前显示项
Battlefield open (UTC) || Medan perang dibuka (UTC) || 战场开启时间（UTC）
Roster deadline (UTC) || Batas waktu roster (UTC) || 名单截止时间（UTC）
Threshold || Ambang batas || 阈值
Power threshold || Ambang kekuatan || 战力阈值
Minimum power || Kekuatan minimum || 最低战力
Maximum players || Jumlah maksimum pemain || 玩家人数上限

# Toast notifications and validation messages
Please enter Nickname! || Harap masukkan nickname! || 请输入昵称！
Please enter Game ID! || Harap masukkan ID Game! || 请输入游戏 ID！
Please enter valid Troops Power! || Harap masukkan kekuatan pasukan yang valid! || 请输入有效的部队战力！
You don't have permission to add players. || Anda tidak memiliki izin untuk menambahkan pemain. || 您没有权限添加玩家。
You don't have permission to edit this player's alliance. || Anda tidak memiliki izin untuk mengubah aliansi pemain ini. || 您没有权限修改该玩家的联盟。
You don't have permission to save changes for this player. || Anda tidak memiliki izin untuk menyimpan perubahan pemain ini. || 您没有权限保存该玩家的更改。
Player power added successfully! || Kekuatan pemain berhasil ditambahkan! || 玩家战力添加成功！
Error inserting data: {0} || Gagal memasukkan data: {0} || 插入数据时出错：{0}
You don't have permission to set this legion's schedule. || Anda tidak memiliki izin untuk mengatur jadwal legiun ini. || 您没有权限设置该军团的日程。
Please select a match day! || Harap pilih hari pertandingan! || 请选择比赛日期！
Please select a match time! || Harap pilih waktu pertandingan! || 请选择比赛时间！
Schedule for {0} updated! || Jadwal untuk {0} diperbarui! || {0} 的日程已更新！
Failed to save schedule: {0} || Gagal menyimpan jadwal: {0} || 保存日程失败：{0}
Login to export the roster. || Silakan login untuk mengekspor roster. || 请登录后导出名单。
No data to export! || Tidak ada data untuk diekspor! || 没有可导出的数据！
No players match your search. || Tidak ada pemain yang cocok dengan pencarian Anda. || 没有符合搜索条件的玩家。
CSV Downloaded successfully! || CSV berhasil diunduh! || CSV 下载成功！
Select at least one player first. || Pilih setidaknya satu pemain terlebih dahulu. || 请先至少选择一名玩家。
Please try again. || Silakan coba lagi. || 请重试。
Share link copied. || Tautan berbagi berhasil disalin. || 分享链接已复制。
Chart image downloaded. || Gambar grafik berhasil diunduh. || 图表图片已下载。
Unable to download chart image. || Tidak dapat mengunduh gambar grafik. || 无法下载图表图片。
Unable to generate chart image. || Tidak dapat membuat gambar grafik. || 无法生成图表图片。
Frostdragon roster is locked. || Roster Frostdragon terkunci. || Frostdragon 名单已锁定。
Frostdragon roster is locked. Unlock it in President Panel to make changes. || Roster Frostdragon terkunci. Buka kuncinya di President Panel untuk melakukan perubahan. || Frostdragon 名单已锁定。请在会长面板中解锁后再修改。
Unable to save task: {0} || Tidak dapat menyimpan tugas: {0} || 无法保存任务：{0}
Frostdragon tasks saved. || Tugas Frostdragon berhasil disimpan. || Frostdragon 任务已保存。
You don't have permission to edit this roster. || Anda tidak memiliki izin untuk mengedit roster ini. || 您没有权限编辑此名单。
Login to view the roster chart. || Silakan login untuk melihat grafik roster. || 请登录后查看名单图表。
Enter a number between 0 and {0}. || Masukkan angka antara 0 dan {0}. || 请输入介于 0 和 {0} 之间的数字。
Dragonite Collectors are already arranged this way. || Pengumpul Dragonite sudah diatur seperti ini. || Dragonite 收集者已按此方式安排。
{0} updates failed; the rest were saved. || {0} pembaruan gagal; sisanya berhasil disimpan. || {0} 项更新失败，其余已保存。
Dragonite Collectors updated ({0} players). || Pengumpul Dragonite diperbarui ({0} pemain). || Dragonite 收集者已更新（{0} 名玩家）。
Checklist saved. || Checklist berhasil disimpan. || 清单已保存。
Unable to save checklist: {0} || Tidak dapat menyimpan checklist: {0} || 无法保存清单：{0}
Staff access required. || Memerlukan akses staf. || 需要工作人员权限。
Schedule save failed: {0} || Gagal menyimpan jadwal: {0} || 日程保存失败：{0}
Frostdragon schedule saved (UTC). || Jadwal Frostdragon berhasil disimpan (UTC). || Frostdragon 日程已保存（UTC）。
Roster lock update failed: {0} || Gagal memperbarui kunci roster: {0} || 更新名单锁定状态失败：{0}
Frostdragon roster locked. || Roster Frostdragon dikunci. || Frostdragon 名单已锁定。
Frostdragon roster unlocked. || Roster Frostdragon dibuka kuncinya. || Frostdragon 名单已解锁。
Username cannot be empty. || Nama pengguna tidak boleh kosong. || 用户名不能为空。
Username: 2-32 chars, letters/numbers/. _ - only. || Nama pengguna: 2–32 karakter, hanya huruf/angka/titik/garis bawah/strip. || 用户名需为 2–32 个字符，只能包含字母、数字、点、下划线和连字符。
Password must be at least 6 characters. || Kata sandi harus minimal 6 karakter. || 密码至少需要 6 个字符。
Password confirmation does not match. || Konfirmasi kata sandi tidak cocok. || 两次输入的密码不一致。
Nothing to change. || Tidak ada yang perlu diubah. || 没有需要更改的内容。
Failed to update account: {0} || Gagal memperbarui akun: {0} || 更新账户失败：{0}
Account {0} updated. || Akun {0} berhasil diperbarui. || 账户 {0} 已更新。
President Panel data refreshed. || Data President Panel berhasil diperbarui. || 会长面板数据已刷新。
Only the President can switch the Battle theme. || Hanya Presiden yang dapat mengganti tema pertempuran. || 只有会长可以切换战斗主题。
{0} is already active. || {0} sudah aktif. || {0} 已经启用。
Global Battle Theme: {0} || Tema Pertempuran Global: {0} || 全局战斗主题：{0}
Failed to load global Battle Theme: {0} || Gagal memuat Tema Pertempuran Global: {0} || 加载全局战斗主题失败：{0}
Failed to switch global Battle Theme: {0} || Gagal mengganti Tema Pertempuran Global: {0} || 切换全局战斗主题失败：{0}
Username: 2-32 chars, letters/numbers/. _ - only. || Nama pengguna: 2–32 karakter, hanya huruf/angka/titik/garis bawah/strip. || 用户名需为 2–32 个字符，只能包含字母、数字、点、下划线和连字符。


# Foundry assignment and leaderboard labels
Switch Role || Ganti Peran || 切换角色
Target: || Target: || 目标：
Alliance Category || Kategori Aliansi || 联盟类别
Legion Role Status || Status Peran Legiun || 军团角色状态
Select Player || Pilih Pemain || 选择玩家
Battle (Maximum 30) || Tempur (Maksimal 30) || 战斗（最多 30 人）
Substitute (Maximum 20) || Cadangan (Maksimal 20) || 替补（最多 20 人）
Battle quota is full! (Maximum 30 players) || Kuota pemain tempur penuh! (Maksimal 30 pemain) || 战斗名额已满！（最多 30 名玩家）
Substitute quota is full! (Maximum 20 players) || Kuota pemain cadangan penuh! (Maksimal 20 pemain) || 替补名额已满！（最多 20 名玩家）
TOP 20 TROOPS POWER || 20 Kekuatan Pasukan Teratas || 部队战力前 20 名
BATTLE TROOPS POWER || Kekuatan Pasukan Tempur || 战斗部队战力
SUBSTITUTE TROOPS POWER || Kekuatan Pasukan Cadangan || 替补部队战力


# New languages: Filipino || Italian || Thai
Home || Beranda || 首页 || Home || Home || หน้าแรก
Back to Menu || Kembali ke Menu || 返回菜单 || Bumalik sa Menu || Torna al menu || กลับไปที่เมนู
Close || Tutup || 关闭 || Isara || Chiudi || ปิด
Cancel || Batal || 取消 || Kanselahin || Annulla || ยกเลิก
Save || Simpan || 保存 || I-save || Salva || บันทึก
Delete || Hapus || 删除 || Tanggalin || Elimina || ลบ
Edit || Ubah || 编辑 || I-edit || Modifica || แก้ไข
Search || Cari || 搜索 || Maghanap || Cerca || ค้นหา
Refresh || Muat Ulang || 刷新 || I-refresh || Aggiorna || รีเฟรช
Loading... || Memuat... || 加载中... || Naglo-load... || Caricamento... || กำลังโหลด...
Submit || Kirim || 提交 || Isumite || Invia || ส่ง
Apply || Terapkan || 应用 || Mag-apply || Applica || สมัคร
Reset || Atur Ulang || 重置 || I-reset || Reimposta || รีเซ็ต
Export || Ekspor || 导出 || I-export || Esporta || ส่งออก
Import || Impor || 导入 || I-import || Importa || นำเข้า
Add Player || Tambah Pemain || 添加玩家 || Magdagdag ng Manlalaro || Aggiungi giocatore || เพิ่มผู้เล่น
Add || Tambah || 添加 || Idagdag || Aggiungi || เพิ่ม
Remove || Hapus || 移除 || Alisin || Rimuovi || นำออก
Update || Perbarui || 更新 || I-update || Aggiorna || อัปเดต
Confirm || Konfirmasi || 确认 || Kumpirmahin || Conferma || ยืนยัน
Yes || Ya || 是 || Oo || Sì || ใช่
No || Tidak || 否 || Hindi || No || ไม่
Language || Bahasa || 语言 || Wika || Lingua || ภาษา
Switch language || Ganti bahasa || 切换语言 || Palitan ang wika || Cambia lingua || เปลี่ยนภาษา
Alliance || Aliansi || 联盟 || Alyansa || Alleanza || พันธมิตร
Player || Pemain || 玩家 || Manlalaro || Giocatore || ผู้เล่น
Players || Para Pemain || 玩家 || Mga Manlalaro || Giocatori || ผู้เล่น
Power || Kekuatan || 战力 || Lakas || Potenza || พลัง
Total Power || Total Kekuatan || 总战力 || Kabuuang Lakas || Potenza totale || พลังรวม
Task || Tugas || 任务 || Gawain || Compito || ภารกิจ
Legion || Legiun || 军团 || Legion || Legione || กองทัพ
Battle || Pertempuran || 战斗 || Labanan || Battaglia || การต่อสู้
Substitutes || Cadangan || 替补 || Mga Reserba || Riserve || ตัวสำรอง
Waiting || Menunggu || 等待中 || Naghihintay || In attesa || กำลังรอ
Accepted || Diterima || 已接受 || Tinanggap || Accettato || ยอมรับแล้ว
Rejected || Ditolak || 已拒绝 || Tinanggihan || Rifiutato || ปฏิเสธแล้ว
No data available || Tidak ada data || 暂无数据 || Walang available na data || Nessun dato disponibile || ไม่มีข้อมูล
Redeem Code || Tukarkan Kode || 兑换码 || I-redeem ang Code || Riscatta codice || แลกรหัส
Login || Masuk || 登录 || Mag-login || Accedi || เข้าสู่ระบบ
PRESIDENT PANEL || PANEL PRESIDEN || 会长面板 || PANEL NG PANGULO || PANNELLO DEL PRESIDENTE || แผงประธาน
Foundry Battle Roster || Roster Pertempuran Foundry || Foundry 战斗名单 || Listahan ng Labanan sa Foundry || Elenco battaglia Foundry || รายชื่อการต่อสู้ Foundry
Imperial Foundry || Foundry Kekaisaran || 帝国铸造厂 || Imperial Foundry || Fonderia imperiale || โรงหล่อจักรวรรดิ
Strategy Guide || Panduan Strategi || 战略指南 || Gabay sa Estratehiya || Guida strategica || คู่มือกลยุทธ์
Live Map Share || Bagikan Peta Live || 实时地图分享 || Ibahagi ang Live Map || Condivisione mappa live || แชร์แผนที่สด
Select Player || Pilih Pemain || 选择玩家 || Pumili ng Manlalaro || Seleziona giocatore || เลือกผู้เล่น
Switch Role || Ganti Peran || 切换角色 || Palitan ang Papel || Cambia ruolo || เปลี่ยนบทบาท
Target: || Target: || 目标： || Target: || Obiettivo: || เป้าหมาย:
Alliance Category || Kategori Aliansi || 联盟类别 || Kategorya ng Alyansa || Categoria alleanza || หมวดหมู่พันธมิตร
Legion Role Status || Status Peran Legiun || 军团角色状态 || Status ng Papel sa Legion || Stato ruolo legione || สถานะบทบาทกองทัพ
Battle (Maximum 30) || Tempur (Maksimal 30) || 战斗（最多 30 人） || Labanan (Hanggang 30) || Battaglia (massimo 30) || ผู้ต่อสู้ (สูงสุด 30)
Substitute (Maximum 20) || Cadangan (Maksimal 20) || 替补（最多 20 人） || Reserba (Hanggang 20) || Riserva (massimo 20) || ตัวสำรอง (สูงสุด 20)
TOP 20 TROOPS POWER || 20 Kekuatan Pasukan Teratas || 部队战力前 20 名 || TOP 20 LAKAS NG TROPA || TOP 20 POTENZA TRUPPE || พลังทหาร 20 อันดับแรก
BATTLE TROOPS POWER || Kekuatan Pasukan Tempur || 战斗部队战力 || LAKAS NG PANG-LABANG TROPA || POTENZA TRUPPE DA BATTAGLIA || พลังทหารรบ
SUBSTITUTE TROOPS POWER || Kekuatan Pasukan Cadangan || 替补部队战力 || LAKAS NG RESERBANG TROPA || POTENZA TRUPPE DI RISERVA || พลังทหารสำรอง
RANK || PERINGKAT || 排名 || RANGGO || POSIZIONE || อันดับ
ALLIANCE || ALIANSI || 联盟 || ALYANSA || ALLEANZA || พันธมิตร
NICKNAME || NAMA PANGGILAN || 昵称 || PALAYAW || SOPRANNOME || ชื่อเล่น
GAME ID || ID GAME || 游戏 ID || GAME ID || ID GIOCO || ไอดีเกม
TROOPS POWER || KEKUATAN PASUKAN || 部队战力 || LAKAS NG TROPA || POTENZA TRUPPE || พลังทหาร
PREF. TIME || WAKTU PILIHAN || 首选时间 || GUSTONG ORAS || ORARIO PREFERITO || เวลาที่ต้องการ
STATUS || STATUS || 状态 || STATUS || STATO || สถานะ
ACTION || AKSI || 操作 || AKSYON || AZIONE || การดำเนินการ

# Full-site six-language audit: common labels and messages
Home ||  ||  || Tahanan || Home || หน้าแรก
Back to Menu ||  ||  || Bumalik sa Menu || Torna al menu || กลับไปที่เมนู
Close ||  ||  || Isara || Chiudi || ปิด
Cancel ||  ||  || Kanselahin || Annulla || ยกเลิก
Save ||  ||  || I-save || Salva || บันทึก
Delete ||  ||  || Burahin || Elimina || ลบ
Edit ||  ||  || I-edit || Modifica || แก้ไข
Search ||  ||  || Maghanap || Cerca || ค้นหา
Refresh ||  ||  || I-refresh || Aggiorna || รีเฟรช
Loading... ||  ||  || Naglo-load... || Caricamento... || กำลังโหลด...
Submit ||  ||  || Isumite || Invia || ส่ง
Apply ||  ||  || Mag-apply || Applica || นำไปใช้
Reset ||  ||  || I-reset || Reimposta || รีเซ็ต
Export ||  ||  || I-export || Esporta || ส่งออก
Import ||  ||  || I-import || Importa || นำเข้า
Add Player ||  ||  || Magdagdag ng Manlalaro || Aggiungi giocatore || เพิ่มผู้เล่น
Add ||  ||  || Idagdag || Aggiungi || เพิ่ม
Remove ||  ||  || Alisin || Rimuovi || นำออก
Update ||  ||  || I-update || Aggiorna || อัปเดต
Confirm ||  ||  || Kumpirmahin || Conferma || ยืนยัน
Yes ||  ||  || Oo || Sì || ใช่
No ||  ||  || Hindi || No || ไม่
Language ||  ||  || Wika || Lingua || ภาษา
Switch language ||  ||  || Palitan ang wika || Cambia lingua || เปลี่ยนภาษา
Select tasks ||  ||  || Pumili ng mga gawain || Seleziona attività || เลือกภารกิจ
All Alliances ||  ||  || Lahat ng Alyansa || Tutte le alleanze || พันธมิตรทั้งหมด
All Tasks ||  ||  || Lahat ng Gawain || Tutte le attività || ภารกิจทั้งหมด
No matching players ||  ||  || Walang katugmang manlalaro || Nessun giocatore corrispondente || ไม่พบผู้เล่นที่ตรงกัน
Copy this link: ||  ||  || Kopyahin ang link na ito: || Copia questo link: || คัดลอกลิงก์นี้:
Lock roster ||  ||  || I-lock ang roster || Blocca elenco || ล็อกรายชื่อ
Unlock roster ||  ||  || I-unlock ang roster || Sblocca elenco || ปลดล็อกรายชื่อ
Event phase ||  ||  || Yugto ng event || Fase dell’evento || ช่วงกิจกรรม
Schedule not set ||  ||  || Hindi pa naitatakda ang iskedyul || Programma non impostato || ยังไม่ได้ตั้งกำหนดการ
Assign Player ||  ||  || Magtalaga ng Manlalaro || Assegna giocatore || กำหนดผู้เล่น
Copy link ||  ||  || Kopyahin ang link || Copia link || คัดลอกลิงก์
Unable to load map. Check your connection or Supabase read permissions, then refresh. ||  ||  || Hindi ma-load ang mapa. Suriin ang koneksyon o pahintulot sa pagbasa ng Supabase, pagkatapos ay i-refresh. || Impossibile caricare la mappa. Controlla la connessione o i permessi di lettura Supabase, quindi aggiorna. || โหลดแผนที่ไม่ได้ โปรดตรวจสอบการเชื่อมต่อหรือสิทธิ์อ่าน Supabase แล้วรีเฟรช
Unable to load chart. Check your connection or Supabase read permissions, then refresh. ||  ||  || Hindi ma-load ang chart. Suriin ang koneksyon o pahintulot sa pagbasa ng Supabase, pagkatapos ay i-refresh. || Impossibile caricare il grafico. Controlla la connessione o i permessi di lettura Supabase, quindi aggiorna. || โหลดกราฟไม่ได้ โปรดตรวจสอบการเชื่อมต่อหรือสิทธิ์อ่าน Supabase แล้วรีเฟรช
Small numbers indicate roster slot numbers. ||  ||  || Ipinapakita ng maliliit na numero ang puwesto sa roster. || I numeri piccoli indicano le posizioni nell’elenco. || ตัวเลขขนาดเล็กแสดงหมายเลขช่องในรายชื่อ
No players match your search or filter. ||  ||  || Walang manlalarong tumutugma sa paghahanap o filter. || Nessun giocatore corrisponde alla ricerca o al filtro. || ไม่มีผู้เล่นตรงกับการค้นหาหรือตัวกรอง
No player data available. ||  ||  || Walang available na datos ng manlalaro. || Nessun dato giocatore disponibile. || ไม่มีข้อมูลผู้เล่น
Search nickname... ||  ||  || Maghanap ng palayaw... || Cerca soprannome... || ค้นหาชื่อเล่น...
Login to see Troops Power totals. ||  ||  || Mag-login upang makita ang kabuuang lakas ng tropa. || Accedi per vedere la potenza totale delle truppe. || เข้าสู่ระบบเพื่อดูพลังทหารรวม
Battle Players: ||  ||  || Mga Manlalaro sa Labanan: || Giocatori in battaglia: || ผู้เล่นในการต่อสู้:
No staff accounts found. ||  ||  || Walang nakitang account ng staff. || Nessun account dello staff trovato. || ไม่พบบัญชีเจ้าหน้าที่
Please wait… ||  ||  || Maghintay… || Attendere… || โปรดรอสักครู่…
Select all shown (until slots are full) ||  ||  || Piliin lahat ng ipinapakita (hanggang mapuno ang mga puwesto) || Seleziona tutti quelli mostrati (fino a esaurimento posti) || เลือกทั้งหมดที่แสดง (จนกว่าช่องจะเต็ม)
Assign Selected ||  ||  || Italaga ang mga Napili || Assegna selezionati || กำหนดผู้เล่นที่เลือก
Search Game ID / Nickname ||  ||  || Maghanap ng Game ID / Palayaw || Cerca ID gioco / soprannome || ค้นหา Game ID / ชื่อเล่น
Type game ID or nickname... ||  ||  || Ilagay ang Game ID o palayaw... || Inserisci ID gioco o soprannome... || พิมพ์ Game ID หรือชื่อเล่น...
Bulk Assign Foundry ||  ||  || Maramihang Pagtatalaga sa Foundry || Assegnazione multipla Foundry || กำหนด Foundry แบบกลุ่ม
No Commander assigned. ||  ||  || Walang itinalagang Commander. || Nessun comandante assegnato. || ยังไม่ได้กำหนดผู้บัญชาการ
Battle ||  ||  || Labanan || Battaglia || การต่อสู้
Substitute ||  ||  || Reserba || Riserva || ตัวสำรอง
Foundry Live Map ||  ||  || Live na Mapa ng Foundry || Mappa live Foundry || แผนที่ Foundry สด
Foundry Live Chart ||  ||  || Live na Chart ng Foundry || Grafico live Foundry || กราฟ Foundry สด
Select an option below ||  ||  || Pumili ng opsyon sa ibaba || Seleziona un’opzione qui sotto || เลือกตัวเลือกด้านล่าง
Current President ||  ||  || Kasalukuyang Pangulo || Presidente attuale || ประธานปัจจุบัน
No recent activity ||  ||  || Walang kamakailang aktibidad || Nessuna attività recente || ไม่มีกิจกรรมล่าสุด
Menu ||  ||  || Menu || Menu || เมนู
Back ||  ||  || Bumalik || Indietro || กลับ
Next ||  ||  || Susunod || Avanti || ถัดไป
Previous ||  ||  || Nakaraan || Precedente || ก่อนหน้า
Open ||  ||  || Buksan || Apri || เปิด
Enable ||  ||  || Paganahin || Abilita || เปิดใช้งาน
Disable ||  ||  || Huwag paganahin || Disabilita || ปิดใช้งาน
Copy ||  ||  || Kopyahin || Copia || คัดลอก
Copied! ||  ||  || Nakopya! || Copiato! || คัดลอกแล้ว!
Download ||  ||  || I-download || Scarica || ดาวน์โหลด
Upload ||  ||  || I-upload || Carica || อัปโหลด
Choose file ||  ||  || Pumili ng file || Scegli file || เลือกไฟล์
Select all ||  ||  || Piliin lahat || Seleziona tutto || เลือกทั้งหมด
Clear all ||  ||  || I-clear lahat || Cancella tutto || ล้างทั้งหมด
Clear roster ||  ||  || I-clear ang roster || Svuota elenco || ล้างรายชื่อ
Save changes ||  ||  || I-save ang mga pagbabago || Salva modifiche || บันทึกการเปลี่ยนแปลง
Discard changes ||  ||  || Itapon ang mga pagbabago || Annulla modifiche || ละทิ้งการเปลี่ยนแปลง
Are you sure? ||  ||  || Sigurado ka ba? || Sei sicuro? || แน่ใจหรือไม่?
Please try again. ||  ||  || Pakisubukang muli. || Riprova. || โปรดลองอีกครั้ง
Something went wrong. ||  ||  || May naganap na error. || Qualcosa è andato storto. || เกิดข้อผิดพลาด
Success ||  ||  || Tagumpay || Operazione riuscita || สำเร็จ
Error ||  ||  || Error || Errore || ข้อผิดพลาด
Warning ||  ||  || Babala || Avviso || คำเตือน
Information ||  ||  || Impormasyon || Informazioni || ข้อมูล
No results found ||  ||  || Walang nahanap na resulta || Nessun risultato trovato || ไม่พบผลลัพธ์
No players found ||  ||  || Walang nahanap na manlalaro || Nessun giocatore trovato || ไม่พบผู้เล่น
No events found ||  ||  || Walang nahanap na event || Nessun evento trovato || ไม่พบกิจกรรม
Battle schedule ||  ||  || Iskedyul ng laban || Programma delle battaglie || กำหนดการต่อสู้
Match time ||  ||  || Oras ng laban || Orario della partita || เวลาแข่งขัน
Preferred time ||  ||  || Gustong oras || Orario preferito || เวลาที่ต้องการ
Waiting List ||  ||  || Listahan ng Naghihintay || Lista d’attesa || รายชื่อรอ
Applicants ||  ||  || Mga Aplikante || Richiedenti || ผู้สมัคร
Accepted Slots ||  ||  || Mga Tinanggap na Slot || Posti accettati || ช่องที่ได้รับอนุมัติ
Slots Left ||  ||  || Natitirang Slot || Posti rimanenti || ช่องที่เหลือ
Total Applicants ||  ||  || Kabuuang Aplikante || Richiedenti totali || ผู้สมัครทั้งหมด
Accept ||  ||  || Tanggapin || Accetta || ยอมรับ
Reject ||  ||  || Tanggihan || Rifiuta || ปฏิเสธ
Move ||  ||  || Ilipat || Sposta || ย้าย
Move to time ||  ||  || Ilipat sa oras || Sposta all’orario || ย้ายไปยังเวลา
Remove player ||  ||  || Alisin ang manlalaro || Rimuovi giocatore || นำผู้เล่นออก
Add player ||  ||  || Magdagdag ng manlalaro || Aggiungi giocatore || เพิ่มผู้เล่น
Player name ||  ||  || Pangalan ng manlalaro || Nome giocatore || ชื่อผู้เล่น
Nickname ||  ||  || Palayaw || Soprannome || ชื่อเล่น
Game ID ||  ||  || Game ID || ID gioco || Game ID
Roster ||  ||  || Listahan ng manlalaro || Elenco || รายชื่อ
Battle roster ||  ||  || Listahan ng laban || Elenco battaglia || รายชื่อการต่อสู้
Slot number ||  ||  || Numero ng puwesto || Numero posizione || หมายเลขช่อง
Commander ||  ||  || Kumander || Comandante || ผู้บัญชาการ
Rally Leader ||  ||  || Pinuno ng Rally || Capo rally || หัวหน้ารวมพล
Task assignment ||  ||  || Pagtatalaga ng gawain || Assegnazione attività || การกำหนดภารกิจ
All Legions ||  ||  || Lahat ng Legion || Tutte le legioni || กองทัพทั้งหมด
Phase 1 ||  ||  || Yugto 1 || Fase 1 || ช่วงที่ 1
Phase 2 ||  ||  || Yugto 2 || Fase 2 || ช่วงที่ 2
Phase 3 ||  ||  || Yugto 3 || Fase 3 || ช่วงที่ 3
Task assignment saved. ||  ||  || Na-save ang pagtatalaga ng gawain. || Assegnazione attività salvata. || บันทึกการกำหนดภารกิจแล้ว
Save failed. ||  ||  || Hindi na-save. || Salvataggio non riuscito. || บันทึกไม่สำเร็จ
Loading latest data... ||  ||  || Kinukuha ang pinakabagong datos... || Caricamento degli ultimi dati... || กำลังโหลดข้อมูลล่าสุด...
Loading accounts... ||  ||  || Naglo-load ng mga account... || Caricamento account... || กำลังโหลดบัญชี...
Live Map ||  ||  || Live na Mapa || Mappa live || แผนที่สด
Share ||  ||  || Ibahagi || Condividi || แชร์
Checklist ||  ||  || Checklist || Lista di controllo || รายการตรวจสอบ
Pre-battle checklist ||  ||  || Checklist bago ang laban || Lista di controllo pre-battaglia || รายการตรวจสอบก่อนต่อสู้
Filter ||  ||  || I-filter || Filtra || กรอง
Sort by ||  ||  || Pagbukud-bukurin ayon sa || Ordina per || เรียงตาม
Ascending ||  ||  || Pataas || Crescente || จากน้อยไปมาก
Descending ||  ||  || Pababa || Decrescente || จากมากไปน้อย
Active ||  ||  || Aktibo || Attivo || ใช้งานอยู่
Inactive ||  ||  || Hindi aktibo || Inattivo || ไม่ใช้งาน
Pending ||  ||  || Nakabinbin || In sospeso || รอดำเนินการ
Completed ||  ||  || Tapos na || Completato || เสร็จสิ้น
Failed ||  ||  || Nabigo || Non riuscito || ล้มเหลว
Not available ||  ||  || Hindi available || Non disponibile || ไม่พร้อมใช้งาน
Permission denied ||  ||  || Walang pahintulot || Permesso negato || ไม่ได้รับอนุญาต
Check your connection and try again. ||  ||  || Suriin ang koneksyon at subukang muli. || Controlla la connessione e riprova. || ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง




`);
  I18N.apply(document.body);
});
