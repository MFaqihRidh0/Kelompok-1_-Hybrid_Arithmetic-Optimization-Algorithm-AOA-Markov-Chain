# 🎮 MASTER BRIEFING & PERENCANAAN: "FOG–CLOUD CYBER-DISPATCHER (HMCDS 3D GAME PRESENTATION)"

**Dokumen Perencanaan & Spesifikasi Teknis (*Single Source of Truth* untuk Implementasi)**  
**Proyek:** Strategi Optimasi Komputasi Awan (SOKA) — Presentasi Hybrid HMCDS (*Markov Chain + AOA*)  
**Target Direktori Kerja:** `04_Presentasi_Hybrid/`  
**Sumber Materi Wajib:** `04_Presentasi_Hybrid/materi_presentasi_hybrid_hmcds_aoa_markov_chain (1).md`  
**Referensi Arsitektur Engine:** `03_Implementasi_Real_World_Game/` (*Three.js, OrbitControls, WebAudio Procedural Synth + Howler.js, Centered Floating Slide Window, Dual-Mode Switcher*)

---

## 1. Visi Utama & Alur Pengalaman Pengguna (Core Game Loop)

Presentasi **HMCDS (*Hybrid Markov Chain-Based Dynamic Scheduling*)** dikemas menjadi **Game Simulasi Aksi 3D (*3D Packet Rush & Load Balancer*)** bertema **Fog–Cloud Cyber-Dispatcher**.

Presenter mengendalikan **Unit Drone `CF_Manager`** yang bergerak menyusuri jalur menanjak melintasi **3 Lapisan Arsitektur Nyata** (*IoT Sensor Valley* $\rightarrow$ *Fog Edge Plateau* $\rightarrow$ *Cloud Sky Citadel*). Perpindahan antar-slide dilakukan dengan **menstabilkan 7 Pos Cluster Server yang sedang mengalami masalah (*Overload / Bottleneck / High Latency*)** menggunakan 2 jurus inti algoritma HMCDS: **Markov Radar (`[J]`)** dan **AOA Arithmetic Beam (`[K]`)**.

```mermaid
flowchart TD
    A["1. Beranda Spotlight Intro\n(Layar Gelap + Sorotan Drone CF_Manager + 'CLICK TO START')"] -->|Klik Layar & Aktifkan Audio| B["2. Zona 1: IoT Sensor Valley (y = 0)\n(Kontrol Drone WASD / Auto-Walk)"]
    B -->|Dekati Pos Cluster 1 s.d. 7| C["3. Cluster Bermasalah (100% Instability 🔴)\nStatus: OVERLOADED / BOTTLENECK"]
    C -->|Lancarkan 2 Aksi HMCDS:\n1x Markov Radar [J] + 1x AOA Beam [K]\natau 1x Instant Hybrid [L]| D["4. Cluster Stabil (0% Instability 🟢)\nBeban Seimbang (Status: NORMAL)"]
    D -->|Otomatis Muncul Saat Stabil| E["5. Jendela Slide Mengambang di Tengah Layar\n(84vw x 82vh, Tombol Layar Penuh ⛶ & Tutup ✕)"]
    E -->|Klik ✕ / Tekan ESC| F["6. Kembali ke Dunia 3D\nDi Atas Cluster Muncul Hologram:\n'🔓 [O] / Klik : Buka Slide (Pos X)'"]
    F -->|Lanjut Menanjak ke Lapisan Berikutnya| C
    F -->|Tekan [O] / Klik Cluster Hijau| E
```

---

## 2. Evaluasi Desain & Mitigasi Risiko Presentasi (Pre-Implementation Review)

Sebelum menulis kode, rancangan dievaluasi terhadap 5 potensi risiko saat presentasi langsung di depan dosen:

| No | Aspek Evaluasi | Potensi Risiko | Solusi Mitigasi dalam Rancangan |
| :-: | :--- | :--- | :--- |
| **1** | **Navigasi 3 Lapisan Vertikal (IoT $\rightarrow$ Fog $\rightarrow$ Cloud)** | Jalur menanjak (`y = 0` ke `y = 9`) berisiko membuat karakter melayang, tenggelam di lantai, atau kamera terhalang ramp. | Gunakan **1 spline kurva 3D (`CatmullRomCurve3`)** sebagai sumber tunggal posisi jalan (`x, y, z`). Ketinggian drone dan fokus kamera di-*sample* mulus dari `y` kurva terdekat + efek *hovering* ringan. |
| **2** | **Keterbacaan Rumus Matematis** | Materi HMCDS penuh notasi matematika ($L_i(t)$, $P_{ij}$, $\text{ETC}_{ij}$, $\text{MOA}$, $\text{MOP}$). Teks mentah `$...$` akan sulit dibaca dosen. | Integrasikan **KaTeX (via CDN)** atau *styled HTML math blocks* di dalam jendela slide agar seluruh persamaan tampil tajam dan profesional baik dalam mode mengambang maupun Layar Penuh (`⛶`). |
| **3** | **Kontrol Presenter Saat Berbicara** | Presenter bisa salah arah atau membuang waktu berjalan antar-pos saat menjelaskan sambil memegang mikrofon. | Pertahankan **Tombol `MULAI PRESENTASI →` (Auto-Walk ke Pos berikutnya)**, **Jurus Instant Hybrid (`[L]` / Spasi)** untuk 1-klik langsung stabil, dan **Menu Teleport `📍` (Pos 1–7)** untuk lompat instan saat sesi tanya jawab. |
| **4** | **Gangguan Audio Game Saat Menjelaskan** | Musik latar / efek suara tabrakan tetap berbunyi ketika slide terbuka dan menutupi suara presenter. | Wajib terapkan *auto-pause/mute* audio game saat `openSlideWindow()` dipanggil, dan *auto-resume* saat `closeSlideWindow()` (pola yang sudah terbukti di `03_Implementasi_Real_World_Game`). |
| **5** | **Performa & Kesiapan Fallback** | Laptop presentasi dengan GPU terintegrasi bisa mengalami *frame drop* jika terlalu banyak *shadow* atau partikel 3D. | Gunakan *low-poly stylized geometry*, batasi `pixelRatio` maksimal `2`, hentikan loop render simulator mini saat jendela slide ditutup, dan sediakan **Mode Presentasi Standar (`presentasi_standar.html`)** sebagai *dual-mode fallback*. |

---

## 3. Mekanika Inti Game: "Fog–Cloud Cyber-Dispatcher"

### A. Karakter Utama: *Drone Kurir `CF_Manager` (The HMCDS Dispatcher)*
* **Visual 3D:** Model *stylized hover-drone* futuristik dengan inti kristal bercahaya, dua lengan emitter mengambang di sisi kiri dan kanan, serta animasi *tilt/banking* halus saat bergerak dengan `WASD` / `Arrow Keys` atau *Auto-Walk*.
* **Emitter Kiri — Markov Radar (`Biru-Cyan`):** Memancarkan gelombang cincin radar (*scanning wave*) untuk membaca status beban VM.
* **Emitter Kanan — AOA Arithmetic Beam (`Oranye-Emas`):** Memancarkan sinar partikel berisi simbol operator **`÷  ×  -  +`** untuk mengoptimasi pemetaan tugas.

### B. Objek Pos Slide: *7 Cluster Server Bermasalah (Stationary Nodes)*
* Berbeda dari game monster, setiap Pos (1 s.d. 7) adalah **Cluster Server / Gerbang Lapisan** yang diam di tempat (*stationary*) dengan **Bar Ketidakstabilan (*Instability Bar* = `100%`)** berwarna Merah-Oranye (`OVERLOADED 🔴`) dan aura percikan *error*.
* **2-Hit Hybrid Stabilization (Cepat & Informatif):**
  1. **Aksi 1 — Markov Radar (`Tombol J` / `Klik Kiri` / `Tombol 1`):**
     * Menembakkan gelombang *Markov Scan* ke Cluster terdekat (-50% Instability).
     * Memunculkan *Floating Text*: **`📡 MARKOV SCAN: P_ij >= MAX! (Prediksi Overload)`**.
     * Visual Cluster memunculkan cincin status Merah (Overload) dan Hijau (Target Low-Load).
  2. **Aksi 2 — AOA Beam (`Tombol K` / `Klik Kanan` / `Tombol 2`):**
     * Menembakkan sinar operator **`÷ × - +`** dari *AOA Emitter* (-50% Instability $\rightarrow$ **`0%` / STABIL**).
     * Memunculkan *Floating Text*: **`⚡ AOA OPTIMIZED: Load Balanced! 🟢`**.
     * Lampu lantai Pos berubah dari **Merah** menjadi **Hijau Emerald**, paket data mengalir rapi, dan **Jendela Slide Pos X otomatis terbuka**.
  3. **Aksi Pintas — Instant Hybrid HMCDS (`Tombol L` / `Spasi`):**
     * Menggabungkan Markov Radar + AOA Beam sekaligus (**100% Stabilisasi instan**) jika presenter ingin membuka slide dengan 1 tombol.

### C. Mekanika Re-Open Slide (`[O]`) & Navigasi
* Setelah stabil, Cluster tetap berada di arena dalam kondisi **Hijau Emerald (Stabil)** dengan label hologram melayang:
  > **`🔓 [O] / Klik : Buka Slide (Pos X)`**
* Kapan saja presenter mendekati Cluster hijau tersebut dan menekan **`O`** (atau mengklik Cluster-nya), slide terbuka kembali.

---

## 4. Arsitektur Dunia 3D Berjenjang (3-Layer Infrastructure World)

Dunia 3D dirancang sebagai perjalanan fisik menanjak yang merepresentasikan topologi jurnal **Khaledian et al. (2025)**:

1. **Lapisan 1 — IoT / Sensor Valley (`y = 0.0`, Pos 1 & Pos 2):**
   * Lantai grid gelap dengan node-node sensor IoT (mobil otonom mini, sensor medis, pabrik pintar) yang memancarkan paket tugas warna-warni ke arah gerbang Fog.
2. **Tanjakan & Lapisan 2 — Fog Edge Plateau (`y = 4.5`, Pos 3, Pos 4, & Pos 5):**
   * Dihubungkan oleh jalan bercahaya menanjak yang landai.
   * Dikelilingi **15 Mini-Tower Fog VM** (`100 – 2.800 MIPS`) dan bangunan pusat **`CF_Manager` (Fog Broker)**.
3. **Tanjakan & Lapisan 3 — Cloud Sky Citadel (`y = 9.0`, Pos 6 & Pos 7):**
   * Puncak arena dengan **2 Data Center Raksasa** (total **40 Cloud VM**, `3.000 – 5.000 MIPS`) yang dihubungkan garis *uplink* cahaya ke Fog Layer di bawahnya.

---

## 5. Pemetaan Lengkap 7 Pos ke 7 Slide Materi HMCDS

Seluruh konten diambil langsung dari `materi_presentasi_hybrid_hmcds_aoa_markov_chain (1).md`:

| Pos Arena | Lokasi Lapisan & Nama Cluster 3D | Judul Slide yang Terbuka | Konten Utama & Visualisasi di Dalam Jendela Slide |
| :-: | :--- | :--- | :--- |
| **Pos 1** | **IoT Valley** (`y=0`)<br>📡 *Sensor Gateway Overload* | **Slide 1: Identitas Riset & 3 Masalah Utama Fog–Cloud** | Metadata jurnal (*Khaledian et al., Sustainable Computing, Elsevier 2025*), keterbatasan Cloud murni vs Fog, dan 3 kartu masalah: **1. Load Instability**, **2. Makespan & Delay Tinggi**, **3. Underutilization of VM**. |
| **Pos 2** | **IoT $\rightarrow$ Fog Gate** (`y=0`)<br>🚦 *`CF_Manager` Task Classifier* | **Slide 2: Arsitektur 3 Lapis & Klasifikasi Tugas** | Diagram interaktif 3 Lapis (IoT $\rightarrow$ Fog `CF_Manager` $\rightarrow$ Cloud), klasifikasi tugas (**Real-Time** wajib Fog vs **Non-Real-Time** ke Fog+Cloud, *Lightweight* vs *Heavyweight*, *Independent* vs *DAG*), serta spek **15 Fog VM** vs **40 Cloud VM**. |
| **Pos 3** | **Fog Plateau** (`y=4.5`)<br>🔮 *Markov State Forecaster Node* | **Slide 3: Tahap 1 — Prediksi Beban VM (Markov Chain)** | Penjelasan *Memoryless Property* (ringan tanpa ML berat), rumus $L_i(t) = \lambda_1 E_i(t) + \lambda_2 W_i(t)$ dan $\text{LOAD}(i)$, 3 status VM (`U/L`, `N`, `O/H`), Matriks Probabilitas Transisi $P_{ij}$, dan aturan migrasi proaktif. |
| **Pos 4** | **Fog Plateau** (`y=4.5`)<br>⚙️ *AOA Arithmetic Optimizer Core* | **Slide 4: Tahap 2 — Optimasi Penjadwalan (AOA)** | Fungsi objektif $\text{ETC}_{ij}$, $\text{Cost}_{\text{fog}}$ (Makespan), $F = \alpha D + (1-\alpha)E$, kurva kontrol $\text{MOA}$ & $\text{MOP}$ ($\alpha=5$), serta 4 operator aritmetika: **Eksplorasi ($\div, \times$)** saat $r_1 > \text{MOA}$ dan **Eksploitasi ($-, +$)** saat $r_1 \le \text{MOA}$. |
| **Pos 5** | **Fog–Cloud Bridge** (`y=6.5`)<br>🔗 *Hybrid Synchronization Hub* | **Slide 5: Alur Eksekusi & Pseudocode Hybrid HMCDS** | 5 Tahap algoritma terintegrasi (Step 1–5) lengkap dengan *syntax-highlighted pseudocode* (`Broker Classification` $\rightarrow$ `Markov P_ij` $\rightarrow$ `AOA Init` $\rightarrow$ `AOA Loop + Penalti Kapasitas Markov` $\rightarrow$ `Eksekusi Jadwal`). |
| **Pos 6** | **Cloud Citadel** (`y=9.0`)<br>📊 *NASA Ames iPSC/860 Benchmark* | **Slide 6: Eksperimen & Hasil Evaluasi Empiris** | Konfigurasi simulasi (*MATLAB R2021b, Dataset NASA Ames iPSC/860 14.794 jobs, N_pop=10, M_Iter=30*), **3 Tabel/Grafik Perbandingan** (Waktu Eksekusi 500–1500 tugas vs FA/PSO/WOA/JSO/HHO; Makespan 500–2000 tugas vs CSA/HGSWC/ChoA/WOA; dan **Trade-off Komponen**: Markov `2,45s` + AOA `4,34s` = HMCDS `6,86s`). |
| **Pos 7** | **Cloud Citadel Peak** (`y=9.0`)<br>🏆 *HMCDS Command Core (Final)* | **Slide 7: Kesimpulan, Live Simulator HMCDS & Glosarium Q&A** | Ringkasan dampak (**Makespan -8,29%**, **Delay -11,72%**, **PIR +4,66%**), **Konsol Simulator Interaktif HMCDS** (simulasi perbandingan *Random / AOA-only / HMCDS* pada 500–2000 tugas dengan animasi bar beban Fog & Cloud), serta **Glosarium Istilah Q&A** untuk tanya jawab dosen. |

---

## 6. Spesifikasi HUD, Antarmuka & Dual-Mode

Mengadopsi standar UI dari `03_Implementasi_Real_World_Game/`:
1. **Beranda Spotlight Intro:** Latar `#120e24` dengan lantai grid `+`, sorotan lampu hangat pada Drone `CF_Manager`, dan teks `Amatic SC` **`CLICK TO START`**.
2. **HUD Dunia 3D:**
   * **Kiri Atas:** Kartu identitas (`SOKA • HYBRID HMCDS`), judul `FOG-CLOUD DISPATCHER`, tombol **`MULAI PRESENTASI →`**, dan tombol **`📊 Mode Standar`** (beralih ke `presentasi_standar.html`).
   * **Kanan Atas:** Tombol `☰` (Menu & Kredit), `📍` (Teleport Pos 1–7 + Buka Slide Cepat), `🔍+` / `🔍-` (Zoom), dan `🔊` (Audio Toggle).
   * **Kiri Bawah:** Kartu Progres (`X/7 Cluster Distabilkan`) + Hotbar Jurus (`[J] 📡 Markov`, `[K] ⚡ AOA`, `[L] 💥 Hybrid`, `[O] 🔓 Buka Slide`).
   * **Tengah Bawah:** Pill bantuan kontrol kamera 360° & pergerakan.
3. **Jendela Slide Mengambang (`Centered Floating Window`):**
   * Ukuran default `width: 84vw` (maks `1080px`), `height: 82vh`, *backdrop blur* agar dunia 3D di tepi layar tetap terlihat.
   * Header wajib memiliki: Badge Pos, Tombol `⛶ Layar Penuh`, Tombol `✕ Tutup`, serta navigasi `← Sebelumnya` / `Lanjut Pos Berikutnya →` di footer jendela.

---

## 7. Rencana Struktur File di `04_Presentasi_Hybrid/`

```text
04_Presentasi_Hybrid/
├── materi_presentasi_hybrid_hmcds_aoa_markov_chain (1).md  <-- Materi sumber (sudah ada)
├── BRIEFING_KONSEP_GAME_3D_HMCDS.md                        <-- Dokumen perencanaan ini
├── index.html                                              <-- Entry utama (redirect/load presentasi_game.html)
├── presentasi_game.html                                    <-- Mode Game 3D (Fog-Cloud Cyber-Dispatcher)
├── presentasi_standar.html                                 <-- Mode Presentasi Standar (Dashboard 2 Kolom + Simulator)
├── css/
│   ├── game.css                                            <-- Styling HUD, Intro, Floating Slide Window, & Math Blocks
│   └── style.css                                           <-- Styling Mode Presentasi Standar
└── js/
    ├── data.js                                             <-- Data 7 Pos, Benchmark NASA iPSC/860, & Glosarium
    ├── audio.js                                            <-- Procedural WebAudio Synth (Markov Ping, AOA Beam, Stabilized Chime, BGM)
    ├── game-engine.js                                      <-- Three.js 3-Layer World (IoT->Fog->Cloud), Drone Hero, & 7 Cluster Nodes
    ├── game-ui.js                                          <-- Controller Slide Window, KaTeX Math, Teleport, & Simulator HMCDS
    └── presentation.js                                     <-- Controller Mode Presentasi Standar
```

---

## 8. Daftar Periksa Eksekusi (Siap Dikerjakan Setelah Konfirmasi)
1. Buat `css/game.css` dan `css/style.css` (adaptasi dari `03_Implementasi_Real_World_Game` + styling tabel/rumus HMCDS).
2. Buat `js/data.js` berisi seluruh angka empiris jurnal Khaledian et al. (2025), koordinat jalur menanjak 3 lapis, dan konfigurasi 7 Pos.
3. Buat `js/audio.js` untuk efek suara *Markov Radar Scan*, *AOA Beam*, *Cluster Stabilized*, dan *BGM* dengan *auto-pause* saat slide terbuka.
4. Buat `js/game-engine.js` dengan spline jalur menanjak 3 lapis (*IoT Valley $\rightarrow$ Fog Plateau $\rightarrow$ Cloud Citadel*), model 3D Drone `CF_Manager`, dan 7 Cluster Server.
5. Buat `js/game-ui.js`, `presentasi_game.html`, `presentasi_standar.html`, dan `index.html`.
6. Verifikasi di browser (cek *console errors*, perpindahan 7 pos, rendering rumus, simulator interaktif, dan tombol `⛶` / `📍` / `📊 Mode Standar`).
