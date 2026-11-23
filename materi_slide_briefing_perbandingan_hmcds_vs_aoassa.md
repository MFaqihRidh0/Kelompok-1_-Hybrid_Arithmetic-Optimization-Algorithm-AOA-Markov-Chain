# Materi Slide Presentasi: Mengapa Memilih HMCDS (AOA + Markov Chain) Dibandingkan AOA-SSA?

Dokumen ini berisi konten terstruktur untuk slide tambahan pada website presentasi dan panduan *briefing* tim, yang menjelaskan alasan teknis serta keunggulan *output* **HMCDS (AOA + Markov Chain)** dibandingkan **AOA-SSA** berdasarkan kondisi sistem.

---

## 1. Judul & Pesan Utama Slide (*Headline*)
* **Judul Slide:** Mengapa Memilih **HMCDS (AOA + Markov Chain)** Dibandingkan **AOA-SSA**?
* **Sub-judul / Pesan Utama:** Menjawab tantangan **Dynamic Task Scheduling & Load Balancing** secara proaktif dan ringan dibandingkan optimasi penempatan data (*data placement*).

---

## 2. Tabel Perbandingan Output Berdasarkan Kondisi Sistem (*Condition-Based Comparison*)

| Kondisi / Skenario Sistem | Output **HMCDS (AOA + Markov Chain)** *(Pilihan Utama)* | Output **AOA-SSA** *(Pembanding)* |
| :--- | :--- | :--- |
| **1. Karakteristik Beban Kerja (*Workload*)** | **Unggul pada beban kerja dinamis & *real-time* IoT:** Memisahkan tugas *real-time* (dieksekusi di *Fog*) dan *non-real-time* (dialihkan ke *Cloud*), serta memprediksi lonjakan beban VM sebelum terjadi *overload*. | **Fokus pada manajemen penyimpanan (*Data Replication*):** Berorientasi pada penentuan *file* populer yang harus diduplikasi dan lokasi penempatannya di *data center*, bukan penjadwalan eksekusi tugas CPU secara dinamis. |
| **2. Pencegahan Server Penuh (*Load Instability*)** | **Proaktif & Prediktif:** Menggunakan matriks transisi Markov Chain untuk meramal VM yang akan *overloaded* ($P_{ij} \ge \text{MAX}$) dan langsung memigrasikan tugas ke VM *low-load*. | **Reaktif & Struktural:** Mengandalkan pencarian populasi metaheuristik ganda (AOA + SSA) tanpa mekanisme prediksi probabilistik terhadap perubahan status beban VM di masa depan. |
| **3. Kinerja pada Skala Tugas Besar (*Scalability*)** | **Eksekusi sangat cepat dan hemat energi:** Terbukti memangkas rata-rata *makespan* sebesar **8,29%** dan *delay* **11,72%**, serta menyelesaikan penjadwalan 1.000 tugas dalam **13,41 detik**. | **Overhead komputasi lebih kompleks:** Menggabungkan dua metaheuristik (AOA + SSA) ditambah algoritma *shortest path* Floyd sehingga memiliki banyak komponen tambahan untuk perhitungan rute jaringan. |
| **4. Kebutuhan Memori & Komputasi di *Fog Node*** | **Ringan (*Lightweight*):** Sifat *memoryless* pada Markov Chain membuat prediksi beban hanya bergantung pada status saat ini tanpa perlu menyimpan histori panjang, sangat cocok untuk *fog node* berkapasitas terbatas. | **Membutuhkan informasi topologi global:** Memerlukan matriks jarak antar-*node* (Floyd), tingkat popularitas *file* ($PD_i$), dan kapasitas penyimpanan antar-region geografis. |

---

## 3. Narasi & 3 Poin Kunci untuk Briefing Presentasi

### Poin 1: Keselarasan Masalah Utama (*Task Scheduling* vs. *Data Placement*)
* **Inti Penjelasan:** Fokus sistem yang kita bangun adalah **penjadwalan tugas komputasi ke Virtual Machine (VM)** agar tidak terjadi antrean panjang (*delay*) dan ketimpangan beban (*load imbalance*). **HMCDS** dirancang secara spesifik untuk menyelesaikan masalah ini, sedangkan **AOA-SSA** berfokus pada masalah replikasi dan penempatan berkas data (*data placement*) antar-lokasi geografis.

### Poin 2: Keunggulan Output pada Kondisi Trafik Fluktuatif
* **Inti Penjelasan:** Ketika sistem menerima ribuan tugas IoT dengan tingkat urgensi yang berbeda (*real-time* dan *non-real-time*), **HMCDS** menghasilkan *output* jadwal yang jauh lebih stabil. **Markov Chain** bertindak sebagai "sistem peringatan dini" yang mendeteksi VM yang hampir penuh sebelum **AOA** melakukan pemetaan tugas.

### Poin 3: Efisiensi Komputasi Tanpa Mengorbankan Akurasi
* **Inti Penjelasan:** Menggabungkan dua algoritma metaheuristik sekaligus (seperti AOA + SSA) berisiko menambah beban komputasi pada perangkat *fog* yang sumber dayanya terbatas. Memasangkan **AOA** dengan **Markov Chain** memberikan keseimbangan optimal: *overhead* rendah berkat sifat *memoryless*, namun tetap menghasilkan peningkatan signifikan pada *makespan* (**8,29%**), pengurangan *delay* (**11,72%**), dan peningkatan *PIR* (**4,66%**).

---

## 4. Spesifikasi Tata Letak & Visualisasi untuk Code Agent (Website Slide)

Jika *code agent* membangun slide perbandingan ini ke dalam website presentasi, gunakan struktur komponen berikut:
* **Layout 2 Kolom (*Split Comparison Card*):**
  * **Kartu Kiri (Pembanding — AOA-SSA):**
    * *Badge:* `Metaheuristic + Metaheuristic + Floyd`
    * *Fokus Kasus:* Replikasi Data & Rute Jaringan Geografis (*Data Placement*)
    * *Keterbatasan pada Kasus Kita:* Tidak memiliki prediksi beban VM dinamis dan memerlukan informasi matriks jarak jaringan global.
  * **Kartu Kanan (Pilihan Kita — HMCDS: AOA + Markov Chain):**
    * *Badge:* `Stochastic Forecasting + Metaheuristic` (Highlight / Active Border)
    * *Fokus Kasus:* Penjadwalan Tugas Dinamis & Penyeimbangan Beban (*Task Scheduling & Load Balancing*)
    * *Alur Kerja Visual:* `IoT Tasks` $\rightarrow$ `Prediksi Status VM (Markov Chain)` $\rightarrow$ `Optimasi Mapping (AOA)`
    * *Highlight Metrik Output:* **`-11.72% Delay`**, **`-8.29% Makespan`**, **`+4.66% PIR`**.
* **Interactive Toggle / Scenario Selector (Opsional untuk Web):**
  * Sediakan 3 tombol kondisi uji (*"Trafik IoT Real-Time Tinggi"*, *"Perangkat Fog Kapasitas Terbatas"*, dan *"Distribusi Replika File Geografis"*) yang menyoroti mengapa HMCDS unggul pada dua skenario pertama.