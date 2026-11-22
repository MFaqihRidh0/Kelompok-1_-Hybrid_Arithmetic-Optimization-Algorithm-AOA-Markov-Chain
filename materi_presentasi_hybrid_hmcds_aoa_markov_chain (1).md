# Spesifikasi & Materi Presentasi: Hybrid HMCDS (Arithmetic Optimization Algorithm + Markov Chain)

Dokumen ini berisi materi lengkap untuk presentasi sekaligus spesifikasi teknis (arsitektur, persamaan matematis, parameter simulasi, dan alur logika) agar dapat langsung diimplementasikan oleh *code agent* ke dalam visualisasi atau simulasi interaktif berbasis web.

---

## 1. Informasi Jurnal Referensi
* **Judul Jurnal:** *Hybrid Markov chain-based dynamic scheduling to improve load balancing performance in fog-cloud environment*
* **Nama Kerangka Kerja:** **HMCDS** (*Hybrid Markov Chain-Based Dynamic Scheduling*)
* **Penulis:** Navid Khaledian, Shiva Razzaghzadeh, Zeynab Haghbayan, & Marcus Völp (University of Luxembourg & Islamic Azad University).
* **Publikasi:** *Sustainable Computing: Informatics and Systems* (Elsevier), Vol. 45, Article 101077, Tahun 2025.
* **DOI / Link:** `https://doi.org/10.1016/j.suscom.2024.101077`

---

## 2. Latar Belakang & Masalah yang Diselesaikan
Dalam ekosistem *Internet of Things* (IoT), penggunaan *Cloud Computing* murni menimbulkan latensi tinggi karena jarak fisik antara perangkat sensor dan pusat data (*data center*). *Fog Computing* hadir mendekatkan pemrosesan ke tepi jaringan (*network edge*), namun server *fog* memiliki kapasitas CPU dan memori yang terbatas.

Tanpa penjadwalan yang cerdas dan adaptif, sistem *Fog–Cloud* mengalami **3 masalah utama**:
1. **Load Instability:** Ketidakstabilan beban kerja yang memicu *bottleneck* (kemacetan komputasi) pada *node* tertentu.
2. **Makespan & Delay Tinggi:** Membengkaknya total waktu penyelesaian tugas (*makespan*) dan waktu tunda (*delay*) antrean, yang sangat fatal bagi aplikasi *real-time* (seperti kendaraan otonom, otomasi industri, dan pemantauan medis).
3. **Underutilization of VM:** Sebagian Virtual Machine (VM) mengalami *overload* sementara VM lainnya menganggur (*idle*), sehingga memboroskan konsumsi energi.

---

## 3. Arsitektur 3 Lapis (*Three-Layer Architecture*) & Klasifikasi Tugas
Kerangka kerja **HMCDS** beroperasi pada tiga lapisan infrastruktur:
1. **IoT / Sensor Layer:** Menghasilkan permintaan tugas (*tasks*) dari perangkat pintar atau pengguna.
2. **Fog Layer (Dikelola oleh `CF_Manager` / *Task Scheduler*):** Menerima seluruh tugas dari lapisan IoT, memantau status sumber daya (*Resource Collection*), dan mengklasifikasikan tugas berdasarkan:
   * **Urgensi (*Deadline*):**
     * **Real-Time Tasks:** Tenggat waktu ketat, wajib diproses langsung di **Fog Layer** terdekat agar latensi minimal.
     * **Non-Real-Time Tasks:** Toleran terhadap jeda (misal: pemrosesan *background*, agregasi data berkala), didistribusikan ke **Fog & Cloud Layer**.
   * **Kebutuhan Sumber Daya:** *Lightweight* (dieksekusi di *edge/fog*) vs *Heavyweight* (dialokasikan ke *fog node* besar atau *cloud*).
   * **Ketergantungan (*Dependency*):** *Independent tasks* vs *Dependent tasks* (dimodelkan dengan *Directed Acyclic Graph* / DAG).
3. **Cloud Layer:** Menyediakan *pool* Virtual Machine berkapasitas besar untuk menangani tugas non-real-time dan *backup* ketika lapisan *fog* penuh.

---

## 4. Spesifikasi Matematis & Cara Kerja Algoritma Hybrid

HMCDS memisahkan proses menjadi **dua tahap terintegrasi**: (1) Prediksi beban VM secara proaktif dengan **Markov Chain**, dan (2) Optimasi pemetaan tugas-ke-VM dengan **Arithmetic Optimization Algorithm (AOA)**.

### Tahap 1: Prediksi Beban VM Menggunakan Markov Chain (*VM Load Forecasting*)
Markov Chain adalah model stokastik dengan sifat *memoryless* (status masa depan $t+1$ hanya bergantung pada status saat ini $t$), sehingga sangat ringan tanpa perlu melatih model *Machine Learning* yang berat.

1. **Perhitungan Beban Tugas ($L_i(t)$) dan Total Beban VM ($\text{LOAD}(i)$):**
   Beban setiap tugas $i$ pada waktu $t$ dihitung dari kombinasi waktu eksekusi $E_i(t)$ dan waktu tunggu $W_i(t)$:
   $$L_i(t) = \lambda_1 E_i(t) + \lambda_2 W_i(t), \quad \text{di mana } \sum \lambda_k = 1$$
   Total beban sebuah VM pada waktu $t$ adalah akumulasi beban tugas yang sedang ditanganinya:
   $$\text{LOAD}(i) = \sum_{k=1}^{n} L_k(t)$$

2. **Klasifikasi Status VM (*States*) & Ambang Batas (*Thresholds*):**
   Setiap VM dikategorikan ke dalam tiga status berdasarkan tiga ambang batas ($\text{MIN}(i)$, $\text{NORMAL}(i)$, dan $\text{MAX}(i)$):
   * `V1 = N` (**Normal Load**)
   * `V2 = U` (**Underloaded / Low Load (`L`)**)
   * `V3 = O` (**Overloaded / High Load (`H`)**)

3. **Matriks Probabilitas Transisi (*Transition Probability Matrix*):**
   Peluang transisi status VM dari status $i$ ke status $j$ pada waktu $t$ dirumuskan sebagai:
   $$P_{ij}(t) = P\{X_{n+1} = j \mid x_n = i\}, \quad \text{dengan syarat } \sum_{j=1}^{N} a_{ij} = 1$$
   Untuk akses jalur multi-langkah (*non-one-step transition probability*) antar-node $i$ dan $j$:
   $$P_{ij} = \sum_{t=2}^{n} \frac{P_{ij}^{(t)} + P_{ji}^{(t)}}{2}$$

4. **Aturan Keputusan Migrasi Beban (*Load Balancing Rule*):**
   * Jika $P_{ij} \le \text{MIN}(d_i)$ $\rightarrow$ VM diprediksi berstatus **Low-Load** (aman menerima tugas baru / tugas limpahan).
   * Jika $P_{ij} \ge \text{MAX}(d_i)$ $\rightarrow$ VM diprediksi akan **Overloaded**; sistem segera memigrasikan tugas dari VM ini ke VM berstatus *Low-Load* hingga kembali stabil ke rentang $\text{NORMAL}(i)$.

---

### Tahap 2: Optimasi Penjadwalan Menggunakan Arithmetic Optimization Algorithm (AOA)
Setelah status beban VM dipetakan oleh Markov Chain, AOA mencari vektor pemetaan (*mapping*) tugas ke VM yang paling optimal.

1. **Fungsi Objektif (*Fitness Function*):**
   * **Expected Time to Compute ($\text{ETC}$):** Matriks waktu eksekusi tugas $i$ (dengan panjang instruksi $T_{len}^i$) pada VM $j$ (dengan kecepatan proses $VM_{pow}^j$):
     $$\text{ETC}_{ij} = \frac{T_{len}^i}{VM_{pow}^j}, \quad i = 1..N_T, \; j = 1..N_{VM}$$
   * **Objective Function Khusus Fog Layer (Real-Time Tasks):** Meminimalkan **Makespan** (waktu selesai paling akhir di antara seluruh VM):
     $$\text{Cost}_{\text{fog}} = \min \left( \max_{j \in \{1..m\}} \sum_{i=1}^{n} \text{ETC}_{ij} \right)$$
   * **Objective Function Gabungan Fog–Cloud (Non-Real-Time Tasks):** Meminimalkan kombinasi **Delay ($D$)** dan **Konsumsi Energi ($E$)**:
     $$F = \alpha \times D + (1 - \alpha) \times E, \quad \alpha \in [0, 1]$$

2. **Parameter Pengendali Pencarian ($\text{MOA}$ dan $\text{MOP}$):**
   Pada setiap iterasi $C\_Iter$ hingga iterasi maksimum $M\_Iter$:
   * **Math Optimizer Accelerated ($\text{MOA}$):** Mengatur transisi antara fase eksplorasi dan eksploitasi:
     $$\text{MOA}(C\_Iter) = \text{Min} + C\_Iter \times \left( \frac{\text{Max} - \text{Min}}{M\_Iter} \right)$$
   * **Math Optimizer Probability ($\text{MOP}$):** Mengatur besaran langkah pembaruan solusi ($\alpha = 5$):
     $$\text{MOP}(C\_Iter) = 1 - \frac{C\_Iter^{1/\alpha}}{M\_Iter^{1/\alpha}}$$

3. **Pembaruan Posisi Solusi (4 Operator Aritmetika):**
   Bangkitkan bilangan acak $r_1, r_2, r_3 \in [0, 1]$ untuk setiap dimensi solusi $j$:
   * **Fase Eksplorasi ($r_1 > \text{MOA}$) — Pencarian Global (Menghindari *Local Optima*):**
     $$X_{i,j}(C\_Iter + 1) = \begin{cases} best(x_j) \div (\text{MOP} + \epsilon) \times ((UB_j - LB_j) \times \mu + LB_j), & r_2 < 0.5 \quad \text{(Division)} \\ best(x_j) \times \text{MOP} \times ((UB_j - LB_j) \times \mu + LB_j), & r_2 \ge 0.5 \quad \text{(Multiplication)} \end{cases}$$
   * **Fase Eksploitasi ($r_1 \le \text{MOA}$) — Pencarian Lokal (*Fine-Tuning*):**
     $$X_{i,j}(C\_Iter + 1) = \begin{cases} best(x_j) - \text{MOP} \times ((UB_j - LB_j) \times \mu + LB_j), & r_3 < 0.5 \quad \text{(Subtraction)} \\ best(x_j) + \text{MOP} \times ((UB_j - LB_j) \times \mu + LB_j), & r_3 \ge 0.5 \quad \text{(Addition)} \end{cases}$$
   *(Keterangan: $UB_j, LB_j$ adalah batas atas & bawah indeks VM, $\mu$ adalah parameter kontrol, dan $\epsilon \approx 0.001$ adalah konstanta kecil pencegah pembagian dengan nol).*

---

## 5. Pseudocode / Alur Eksekusi untuk Implementasi Code Agent
Berikut alur logika sistem HMCDS yang dapat langsung diterjemahkan ke dalam kode simulasi web (JavaScript/TypeScript/Python):

```text
ALGORITHM: HMCDS (Hybrid Markov Chain + AOA)
INPUT:
  - Daftar Tugas (Tasks) dengan atribut: Task_Length (MI), Deadline_Type (Real-Time / Non-Real-Time)
  - Daftar VM di Fog Layer & Cloud Layer dengan atribut: Processing_Speed (MIPS), RAM, Bandwidth
  - Parameter AOA: Population_Size (N_pop = 10), Max_Iter (M_Iter = 30), alpha = 5, epsilon = 0.001

STEP 1: Klasifikasi Tugas & Pemantauan Beban (Fog Broker)
  1. Pisahkan tugas Real-Time (kandidat VM = Fog Layer) dan Non-Real-Time (kandidat VM = Fog + Cloud Layer).
  2. Hitung beban terkini setiap VM: LOAD(i) = sum(lambda_1 * E_i(t) + lambda_2 * W_i(t)).

STEP 2: Prediksi Status VM dengan Markov Chain
  1. Bentuk Matriks Probabilitas Transisi P_ij berdasarkan riwayat transisi status beban VM.
  2. Klasifikasikan prediksi status tiap VM:
     - Jika P_ij <= MIN_threshold -> Status = LOW_LOAD (Prioritas penerima tugas)
     - Jika MIN_threshold < P_ij < MAX_threshold -> Status = NORMAL
     - Jika P_ij >= MAX_threshold -> Status = OVERLOADED (Keluarkan dari daftar kandidat / migrasikan tugasnya)

STEP 3: Inisialisasi Populasi AOA
  1. Bangkitkan N_pop vektor solusi acak X_i (setiap elemen memetakan Task_k ke indeks VM yang valid & tidak Overloaded).
  2. Evaluasi nilai Fitness (Makespan untuk Fog; kombinasi Delay & Energy untuk Fog-Cloud) pada setiap solusi.
  3. Simpan solusi dengan nilai Fitness terbaik sebagai best(x).

STEP 4: Loop Optimasi AOA (C_Iter = 1 sampai M_Iter)
  1. Hitung nilai MOA(C_Iter) dan MOP(C_Iter).
  2. Untuk setiap solusi i = 1 sampai N_pop:
     Untuk setiap tugas j = 1 sampai Jumlah_Tugas:
       Bangkitkan r1, r2, r3 acak di [0, 1].
       Jika r1 > MOA: (Fase Eksplorasi)
         Jika r2 < 0.5 -> Update mapping dengan operator Pembagian (/)
         Else          -> Update mapping dengan operator Perkalian (*)
       Else: (Fase Eksploitasi)
         Jika r3 < 0.5 -> Update mapping dengan operator Pengurangan (-)
         Else          -> Update mapping dengan operator Penjumlahan (+)
       Bulatkan (discretize) & batas-klip nilai posisi ke rentang indeks VM yang valid [LB, UB].
  3. Evaluasi ulang Fitness seluruh populasi (dengan penalti jika melanggar kapasitas beban prediksi Markov).
  4. Perbarui best(x) jika ditemukan solusi yang lebih baik.

STEP 5: Eksekusi Jadwal
  1. Terapkan vektor pemetaan terbaik best(x) untuk mengeksekusi tugas pada VM tujuan.
  2. Hitung metrik akhir: Makespan, Delay, Throughput, Energy Consumption, dan PIR.
```

---

## 6. Parameter Konfigurasi & Data Eksperimen Jurnal (Untuk Grafik/Benchmark Web)

### A. Konfigurasi Lingkungan Simulasi Jurnal
* **Simulator & Hardware:** MATLAB R2021b, Intel Core i7 (2.50 GHz), RAM 16 GB.
* **Dataset Beban Kerja:** *NASA Ames iPSC/860* (14.794 *jobs*, 257 *users*, 240 CPU, rata-rata 202,871 tugas per batch).
* **Parameter AOA:** Ukuran populasi = `10`, Maksimum iterasi = `30`, pengulangan eksperimen = `50 kali`, $\alpha = 5$, $\epsilon = 0.001$.
* **Spesifikasi Infrastruktur:**
  * **Fog Layer:** `15` VM, kecepatan CPU `100 – 2.800 MIPS`, RAM `0,5 GB`, Storage `10 GB`, Bandwidth `1 GB/s`.
  * **Cloud Layer:** `2` Data Center, `4` Host, `10` VM per Host (total `40` VM), kecepatan CPU `3.000 – 5.000 MIPS`, RAM `1 GB`, Storage `20 GB`, Bandwidth `0,5 GB/s`.

### B. Ringkasan Data Hasil Evaluasi (Bahan Tabel / Chart Presentasi)
1. **Peningkatan Rata-Rata Keseluruhan:**
   * **Makespan:** membaik (lebih cepat) sebesar **8,29%**.
   * **Delay:** berkurang sebesar **11,72%**.
   * **PIR (*Performance Improvement Rate*):** meningkat **4,66%** secara umum (dan unggul hingga **22,22%** vs PSO, **8,29%** vs FA, **36,48%** vs WOA, **55,86%** vs HHO, serta **42,68%** vs JSO dalam waktu eksekusi penjadwalan).
2. **Perbandingan Waktu Eksekusi Penjadwalan (Detik):**
   * **500 Tugas:** HMCDS (**6,86 dtk**) vs FA (7,46 dtk), PSO (8,96 dtk), WOA (10,98 dtk), JSO (11,56 dtk), HHO (15,43 dtk).
   * **1.000 Tugas:** HMCDS (**13,41 dtk**) vs FA (14,72 dtk), PSO (15,63 dtk), WOA (21,34 dtk), JSO (23,14 dtk), HHO (30,84 dtk).
   * **1.500 Tugas:** HMCDS (**19,21 dtk**) vs FA (20,87 dtk), PSO (24,61 dtk), WOA (29,84 dtk), JSO (34,18 dtk), HHO (43,21 dtk).
3. **Perbandingan Makespan pada Dataset NASA iPSC (Detik):**
   * **500 Tugas:** HMCDS (**47,21 dtk**) vs CSA (55,09 dtk), HGSWC (58,45 dtk), ChoA (65,70 dtk), WOA (71,53 dtk).
   * **1.000 Tugas:** HMCDS (**96,83 dtk**) vs CSA (106,67 dtk), HGSWC (116,52 dtk), ChoA (128,18 dtk), WOA (142,66 dtk).
   * **2.000 Tugas:** HMCDS (**138,21 dtk**) vs CSA (157,99 dtk), HGSWC (178,16 dtk), ChoA (182,64 dtk), WOA (205,26 dtk).
4. **Analisis *Trade-off* Komponen (Skenario 500 Tugas):**
   * Markov Chain saja: **2,45 detik**
   * AOA saja: **4,34 detik**
   * Hybrid HMCDS (Markov + AOA): **6,86 detik** *(sedikit lebih lama dalam proses penjadwalan, namun menghasilkan penghematan energi dan penurunan delay sistem yang jauh lebih besar saat eksekusi)*.

---

## 7. Glosarium Istilah Penting untuk Tanya Jawab Presentasi
* **Makespan:** Total waktu dari saat tugas pertama mulai dieksekusi hingga tugas terakhir selesai.
* **Delay (Latency):** Waktu tunda sejak tugas dikirim perangkat IoT hingga selesai diproses.
* **Throughput:** Jumlah tugas yang berhasil diselesaikan per satuan waktu ($\text{Throughput} = \sum \text{ExeTime}(t_i)$).
* **PIR (*Performance Improvement Rate*):** Persentase peningkatan performa metode yang diusulkan terhadap metode pembanding: $\text{PIR}(\%) = \frac{Y - Y'}{Y} \times 100\%$.
* **Transition Probability Matrix:** Matriks peluang perpindahan status VM antar-kondisi beban (*Low*, *Normal*, *Overloaded*).
* **Memoryless Property:** Sifat proses Markov di mana keadaan berikutnya hanya bergantung pada keadaan saat ini, membuat komputasi prediksi jauh lebih cepat dibanding *Deep Learning*.
* **MIPS (*Million Instructions Per Second*):** Satuan standar kecepatan pemrosesan CPU pada Virtual Machine.