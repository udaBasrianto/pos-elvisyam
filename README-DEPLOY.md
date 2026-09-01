# 🚀 Panduan Deployment Multi-Domain (posh.web.id & tokoryo.web.id)
### Backend: Go (Gin Engine) | Frontend: React (Vite SPA) | Database: PostgreSQL (Terpisah per Domain)

Dokumen ini memandu langkah demi langkah konfigurasi dan deployment aplikasi POS untuk multi-domain dengan database terisolasi penuh di server VPS / Cloud Linux (aaPanel / Ubuntu / Debian).

---

## 🏗️ Arsitektur Multi-Domain & Database

| Parameter | Domain 1 (`posh.web.id`) | Domain 2 (`tokoryo.web.id`) | (Mendatang) Domain 3 (`pos.elvisyam.com`) |
| :--- | :--- | :--- | :--- |
| **Frontend Folder** | `/www/wwwroot/posh.web.id/dist` | `/www/wwwroot/tokoryo.web.id/dist` | `/www/wwwroot/pos.elvisyam.com/dist` |
| **Backend Service** | `pos-posh.service` | `pos-tokoryo.service` | `pos-elvisyam.service` |
| **Backend Port** | `5001` | `5002` | `5003` |
| **Database Name** | `pos_posh` | `pos_tokoryo` | `pos_elvisyam` |
| **Database User** | `postgres` | `postgres` | `postgres` |
| **Memory RAM Go** | ± 15 - 20 MB | ± 15 - 20 MB | ± 15 - 20 MB |

> 💡 **Fitur AutoMigrate**: Backend Go sudah dilengkapi fitur **AutoMigrate** bawaan. Begitu backend terhubung ke database baru, seluruh 21 tabel, skema, indeks, akun Super Admin default (`admin@pos.local` / `password`), dan token registrasi akan dibuat secara otomatis!

---

## 📋 Langkah-Langkah Deployment di Server

### 1️⃣ Buat Database PostgreSQL Terpisah di Server / aaPanel
Buka PostgreSQL Manager di server Anda, lalu buat 2 database:
1. `pos_posh`
2. `pos_tokoryo`

---

### 2️⃣ Siapkan Direktori & Clone Codebase

```bash
# 1. Masuk ke direktori web root
cd /www/wwwroot

# 2. Clone repositori untuk domain posh.web.id
git clone https://github.com/udaBasrianto/posh.git posh.web.id

# 3. Clone repositori untuk domain tokoryo.web.id
git clone https://github.com/udaBasrianto/posh.git tokoryo.web.id
```

---

### 3️⃣ Build Frontend untuk Masing-Masing Domain

#### Domain 1 (`posh.web.id`):
```bash
cd /www/wwwroot/posh.web.id
echo "VITE_API_URL=/api" > .env.production
npm install
npm run build
```

#### Domain 2 (`tokoryo.web.id`):
```bash
cd /www/wwwroot/tokoryo.web.id
echo "VITE_API_URL=/api" > .env.production
npm install
npm run build
```

---

### 4️⃣ Setup & Compile Backend Go

#### A. Konfigurasi Backend posh.web.id (`PORT=5001`, `DB_NAME=pos_posh`)
```bash
cd /www/wwwroot/posh.web.id/backend

cat << 'EOF' > .env
PORT=5001
GIN_MODE=release
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password_postgres_anda
DB_NAME=pos_posh
DB_SSL=disable

JWT_SECRET=super_secret_jwt_key_posh_2026
UPLOADS_DIR=/www/wwwroot/posh.web.id/uploads
EOF

# Compile binary Go
go build -o server ./cmd/api/main.go
chmod +x server
mkdir -p /www/wwwroot/posh.web.id/uploads
```

#### B. Konfigurasi Backend tokoryo.web.id (`PORT=5002`, `DB_NAME=pos_tokoryo`)
```bash
cd /www/wwwroot/tokoryo.web.id/backend

cat << 'EOF' > .env
PORT=5002
GIN_MODE=release
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password_postgres_anda
DB_NAME=pos_tokoryo
DB_SSL=disable

JWT_SECRET=super_secret_jwt_key_tokoryo_2026
UPLOADS_DIR=/www/wwwroot/tokoryo.web.id/uploads
EOF

# Compile binary Go
go build -o server ./cmd/api/main.go
chmod +x server
mkdir -p /www/wwwroot/tokoryo.web.id/uploads
```

---

### 5️⃣ Jalankan Backend Menggunakan Systemd Service

#### Service 1: `pos-posh.service`
Buat file service:
```bash
sudo nano /etc/systemd/system/pos-posh.service
```
Isikan:
```ini
[Unit]
Description=POS POSH Go Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/www/wwwroot/posh.web.id/backend
ExecStart=/www/wwwroot/posh.web.id/backend/server
Restart=always
RestartSec=5s
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
```

#### Service 2: `pos-tokoryo.service`
Buat file service:
```bash
sudo nano /etc/systemd/system/pos-tokoryo.service
```
Isikan:
```ini
[Unit]
Description=POS TokoRyo Go Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/www/wwwroot/tokoryo.web.id/backend
ExecStart=/www/wwwroot/tokoryo.web.id/backend/server
Restart=always
RestartSec=5s
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
```

#### Aktifkan & Jalankan Kedua Service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pos-posh pos-tokoryo
sudo systemctl start pos-posh pos-tokoryo

# Verifikasi status kedua service
sudo systemctl status pos-posh --no-pager
sudo systemctl status pos-tokoryo --no-pager
```

---

### 6️⃣ Konfigurasi Nginx & Website (di aaPanel / Nginx)

#### A. Website `posh.web.id`
1. Buka menu **Website** → **Add site**:
   - **Domain**: `posh.web.id` dan `www.posh.web.id`
   - **Document Root**: `/www/wwwroot/posh.web.id/dist`
2. Pasang **SSL (Let's Encrypt)**.
3. Buka tab **Config file** / Nginx config, masukkan konfigurasi berikut di dalam blok `server { ... }`:

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
        alias /www/wwwroot/posh.web.id/uploads/;
        expires 30d;
        access_log off;
    }
```

---

#### B. Website `tokoryo.web.id`
1. Buka menu **Website** → **Add site**:
   - **Domain**: `tokoryo.web.id` dan `www.tokoryo.web.id`
   - **Document Root**: `/www/wwwroot/tokoryo.web.id/dist`
2. Pasang **SSL (Let's Encrypt)**.
3. Buka tab **Config file** / Nginx config, masukkan konfigurasi berikut di dalam blok `server { ... }`:

```nginx
    # 1. Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Proxy API ke Backend Go (Port 5002)
    location /api/ {
        proxy_pass http://127.0.0.1:5002;
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
        alias /www/wwwroot/tokoryo.web.id/uploads/;
        expires 30d;
        access_log off;
    }
```

Simpan dan reload Nginx (`nginx -s reload`).

---

## 🔄 Skrip Update Otomatis di Server

Jika ada update kode dari GitHub, Anda cukup menjalankan:

```bash
# Update Posh
cd /www/wwwroot/posh.web.id
git pull origin main
npm run build
cd backend && go build -o server ./cmd/api/main.go
sudo systemctl restart pos-posh

# Update TokoRyo
cd /www/wwwroot/tokoryo.web.id
git pull origin main
npm run build
cd backend && go build -o server ./cmd/api/main.go
sudo systemctl restart pos-tokoryo
```
