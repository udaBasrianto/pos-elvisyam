Viewed README-DEPLOY.md:1-279
Viewed deploy.sh:1-88
Edited main.go
Ran command: `go build -o test_check.exe backend/cmd/api/main.go && Remove-Item test_check.exe`

Memeriksa kompilasi backend...

Used tool: manage_task

Menunggu kompilasi selesai...

Ran command: `git diff`
Used tool: manage_task

Menunggu hasil verifikasi build...

Used tool: manage_task
Ran command: `git status -s`
Ran command: `git commit -am "feat: add pos.elvisyam.com paths support" && git push origin main`

Berikut adalah panduan lengkap langkah demi langkah untuk melakukan **deploy `pos.elvisyam.com` menggunakan fitur Go Project di aaPanel (Arsitektur ARM64)**:

---

### 🏗️ Ringkasan Arsitektur

| Parameter | Konfigurasi |
| :--- | :--- |
| **Domain** | `pos.elvisyam.com` |
| **Server Architecture** | ARM64 (`aarch64`) |
| **Direktori Proyek** | `/www/wwwroot/pos.elvisyam.com` |
| **Frontend Root** | `/www/wwwroot/pos.elvisyam.com/dist` |
| **Backend Directory** | `/www/wwwroot/pos.elvisyam.com/backend` |
| **Executable Go** | `/www/wwwroot/pos.elvisyam.com/backend/server` |
| **Port Backend Go** | `5003` |
| **Database PostgreSQL** | `pos_elvisyam` |

---

### 1️⃣ Buat Database PostgreSQL di aaPanel

1. Buka dashboard **aaPanel** Anda.
2. Masuk ke menu **Databases** → **PostgreSQL**.
3. Buat database baru:
   * **DB Name**: `pos_elvisyam`
   * **Username**: `postgres` (atau user baru)
   * **Password**: *[Catat password PostgreSQL Anda]*

---

### 2️⃣ Clone Repository & Build Frontend di Server

Buka terminal SSH server VPS ARM64 Anda, lalu jalankan:

```bash
# 1. Masuk ke direktori webroot
cd /www/wwwroot

# 2. Clone repositori pos-elvisyam
git clone https://github.com/udaBasrianto/pos-elvisyam.git pos.elvisyam.com

# 3. Masuk ke direktori dan build frontend React SPA
cd /www/wwwroot/pos.elvisyam.com
echo "VITE_API_URL=/api" > .env.production
npm install
npm run build
```

---

### 3️⃣ Setup & Compile Backend Go (Native ARM64)

> 💡 **Kompilasi di ARM64**: Karena dijalankan langsung di server ARM64, perintah `go build` akan secara otomatis menghasilkan binary ELF ARM64 yang optimal.

```bash
# 1. Masuk ke folder backend
cd /www/wwwroot/pos.elvisyam.com/backend

# 2. Buat file .env backend
cat << 'EOF' > .env
PORT=5003
GIN_MODE=release
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=GANTI_DENGAN_PASSWORD_POSTGRES_ANDA
DB_NAME=pos_elvisyam
DB_SSL=disable

JWT_SECRET=super_secret_jwt_key_elvisyam_2026
UPLOADS_DIR=/www/wwwroot/pos.elvisyam.com/uploads
EOF

# 3. Sesuaikan DB_PASSWORD di file .env jika belum sama
nano .env

# 4. Compile binary Go
go build -o server ./cmd/api/main.go
chmod +x server

# 5. Siapkan folder uploads
mkdir -p /www/wwwroot/pos.elvisyam.com/uploads
chmod -R 777 /www/wwwroot/pos.elvisyam.com/uploads
```

---

### 4️⃣ Daftarkan ke "Go Project" di aaPanel

1. Di aaPanel, buka menu **Website** → pilih tab **Go project** (di samping PHP project).
2. Klik tombol **Add Go Project**.
3. Isi parameter form berikut:
   * **Project name**: `pos.elvisyam.com`
   * **Run User**: `root` (atau `www`)
   * **Project directory**: `/www/wwwroot/pos.elvisyam.com/backend`
   * **Executing file**: `/www/wwwroot/pos.elvisyam.com/backend/server`
   * **Port**: `5003`
   * **Domain**: `pos.elvisyam.com`
   * **Auto restart**: ✅ Centang (Aktif)
4. Klik **Submit**. aaPanel akan otomatis menjalankan binary Go dan menjadikannya background daemon.

---

### 5️⃣ Konfigurasi Nginx & SSL di aaPanel

1. Di menu **Website**, klik nama website **`pos.elvisyam.com`**.
2. Masuk ke tab **SSL** → pilih **Let's Encrypt** → klik **Apply** untuk mengaktifkan HTTPS.
3. Masuk ke tab **Config file** (Nginx Configuration), pastikan di dalam blok `server { ... }` terdapat konfigurasi berikut:

```nginx
    # 1. Frontend SPA Routing (React Dist)
    location / {
        root /www/wwwroot/pos.elvisyam.com/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. Reverse Proxy API ke Go Backend (Port 5003)
    location /api/ {
        proxy_pass http://127.0.0.1:5003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Static Media Uploads
    location /uploads/ {
        alias /www/wwwroot/pos.elvisyam.com/uploads/;
        expires 30d;
        access_log off;
    }
```

4. Klik **Save**. Nginx akan otomatis memuat ulang.

---

### 🔑 Akses Default Super Admin
Backend Go dilengkapi fitur **AutoMigrate**. Saat pertama kali dijalankan dan terhubung ke database `pos_elvisyam`, 71 tabel skema dan akun super admin otomatis terbuat:
* **URL**: `https://pos.elvisyam.com`
* **Email**: `mas@abd.com`
* **Password**: `mas@abd.com`

---

### 🔄 Skrip Update Otomatis di Masa Depan
Jika ada perbaikan / commit baru di GitHub, Anda cukup menjalankan perintah ini di server:

```bash
cd /www/wwwroot/pos.elvisyam.com
git pull origin main
npm run build
cd backend && go build -o server ./cmd/api/main.go
# Restart Go project di menu Go Project aaPanel atau restart PID
```

Kompilasi kode dan sinkronisasi ke repository GitHub **[udaBasrianto/pos-elvisyam](https://github.com/udaBasrianto/pos-elvisyam)** telah terverifikasi sukses (100% clean build).

Jika Anda mengalami kendala saat eksekusi langkah di server atau ingin dibuatkan skrip otomatisasi deployment `deploy.sh` khusus server Anda, silakan kabari!