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

`);
  I18N.apply(document.body);
});
