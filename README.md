# Fog–Cloud Cyber-Dispatcher: Hybrid HMCDS (Markov Chain + AOA)

Presentasi interaktif berbasis **Game 3D (Three.js)** dan **Mode Standar** untuk menjelaskan kerangka kerja **HMCDS (*Hybrid Markov Chain-Based Dynamic Scheduling*)** pada lingkungan *Fog–Cloud* (Khaledian et al., *Sustainable Computing: Informatics and Systems*, 2025).

## Fitur Utama
- **Mode Game 3D (`presentasi_game.html`):** Mengendalikan Drone `CF_Manager` menyusuri 3 Lapisan (*IoT Sensor Valley* $\rightarrow$ *Fog Edge Plateau* $\rightarrow$ *Cloud Sky Citadel*) dengan 7 Pos Cluster.
  - `WASD` / Panah: Gerak Drone
  - `J`: **Markov Radar Scan** (-50% Instability)
  - `K`: **AOA Arithmetic Beam** (-50% Instability & buka slide)
  - `L` / `Spasi`: **Instant Hybrid HMCDS** (1-klik langsung stabil)
  - `O` / Klik Cluster Hijau: Buka kembali slide
  - `Drag Mouse` / `Q`-`E`: Putar kamera 360°
- **Mode Presentasi Standar (`presentasi_standar.html` atau `/standar`):** Tampilan slide deck klasik lengkap dengan rumus **KaTeX** dan simulator beban Fog–Cloud.

## Deploy ke Vercel (Standalone Repository)
1. Pindahkan folder ini ke repository GitHub baru, lalu `git init && git add . && git commit -m "init"` dan push ke GitHub.
2. Buka **Vercel** $\rightarrow$ **Add New Project** $\rightarrow$ pilih repository baru tersebut.
3. Biarkan **Framework Preset: `Other`** dan **Root Directory: `./`**, lalu klik **Deploy**.
