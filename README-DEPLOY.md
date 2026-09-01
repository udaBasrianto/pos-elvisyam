# 🚀 Panduan Deployment Server POS (pos.elvisyam.com)
### Backend: Go (Gin Engine) | Frontend: React (Vite SPA) | Database: PostgreSQL

Dokumen ini memandu langkah demi langkah konfigurasi dan deployment aplikasi POS untuk domain **pos.elvisyam.com** di server VPS / Cloud Linux (aaPanel / Ubuntu / Debian).

---

## 🏗️ Parameter Konfigurasi Server

| Parameter | Konfigurasi Server (`pos.elvisyam.com`) |
| :--- | :--- |
| **Domain** | `pos.elvisyam.com` |
| **Frontend Root** | `/www/wwwroot/pos.elvisyam.com/dist` |
| **Backend Directory** | `/www/wwwroot/pos.elvisyam.com/backend` |
| **Backend Service** | `pos-elvisyam.service` |
| **Backend Port** | `5001` |
| **Database Name** | `pos_elvisyam` |
| **Database User** | `postgres` |
| **Memory RAM Go** | ± 15 - 25 MB |

> 💡 **Fitur AutoMigrate**: Backend Go sudah dilengkapi fitur **AutoMigrate** bawaan. Begitu backend terhubung ke database `pos_elvisyam`, seluruh 21 tabel, skema, indeks, akun Super Admin default (`admin@pos.local` / `password`), dan token registrasi akan dibuat secara otomatis!

---

## 📋 Langkah-Langkah Deployment di Server

### 1️⃣ Buat Database PostgreSQL di Server / aaPanel
Buka PostgreSQL Manager di server Anda, lalu buat database:
* **Nama Database**: `pos_elvisyam`
* **User**: `postgres` (atau user DB yang Anda buat)

---

### 2️⃣ Siapkan Direktori & Clone Codebase

```bash
# 1. Masuk ke direktori web root
cd /www/wwwroot

# 2. Clone repositori untuk domain pos.elvisyam.com
git clone https://github.com/udaBasrianto/pos-elvisyam.git pos.elvisyam.com
```

---

### 3️⃣ Build Frontend

```bash
cd /www/wwwroot/pos.elvisyam.com
echo "VITE_API_URL=/api" > .env.production
npm install
npm run build
```

---

### 4️⃣ Setup & Compile Backend Go

```bash
cd /www/wwwroot/pos.elvisyam.com/backend

cat << 'EOF' > .env
PORT=5001
GIN_MODE=release
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password_postgres_anda
DB_NAME=pos_elvisyam
DB_SSL=disable

JWT_SECRET=super_secret_jwt_key_elvisyam_2026
UPLOADS_DIR=/www/wwwroot/pos.elvisyam.com/uploads
EOF

# Compile binary Go
go build -o server ./cmd/api/main.go
chmod +x server
mkdir -p /www/wwwroot/pos.elvisyam.com/uploads
chmod -R 777 /www/wwwroot/pos.elvisyam.com/uploads
```

---

### 5️⃣ Jalankan Backend Menggunakan Systemd Service

Buat file service systemd:
```bash
sudo nano /etc/systemd/system/pos-elvisyam.service
```

Isikan konfigurasi berikut:
```ini
[Unit]
Description=POS Elvisyam Go Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/www/wwwroot/pos.elvisyam.com/backend
ExecStart=/www/wwwroot/pos.elvisyam.com/backend/server
Restart=always
RestartSec=5s
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
```

Aktifkan & Jalankan Service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pos-elvisyam
sudo systemctl start pos-elvisyam

# Verifikasi status service
sudo systemctl status pos-elvisyam --no-pager
```

---

### 6️⃣ Konfigurasi Nginx / aaPanel Website

1. Buka menu **Website** → **Add site**:
   - **Domain**: `pos.elvisyam.com`
   - **Document Root**: `/www/wwwroot/pos.elvisyam.com/dist`
2. Pasang **SSL (Let's Encrypt)**.
3. Buka tab **Config file** / Nginx config, masukkan konfigurasi reverse proxy berikut di dalam blok `server { ... }`:

```nginx
    # 1. Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Proxy API ke Backend Go (Port 5001)
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Static Files Uploads
    location /uploads/ {
        alias /www/wwwroot/pos.elvisyam.com/uploads/;
        expires 30d;
        access_log off;
    }
```

Simpan dan reload Nginx (`sudo nginx -s reload`).

---

## 🔄 Update & Deploy Otomatis Menggunakan `deploy.sh`

Setiap kali ada pembaruan kode dari GitHub di masa mendatang, cukup jalankan:

```bash
cd /www/wwwroot/pos.elvisyam.com
bash deploy.sh
```

Skrip `deploy.sh` akan otomatis:
1. Menarik kode terbaru dari GitHub (`main`).
2. Build frontend React Vite ke `dist/`.
3. Kompilasi ulang binary backend Go (`server`).
4. Restart service `pos-elvisyam` secara instan.
