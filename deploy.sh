#!/bin/bash
# ==========================================================
# 🚀 Skrip Update & Deploy Otomatis (tokoryo.web.id)
# ==========================================================
set -e

# Warna terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   🚀 Memulai Update & Deployment TokoRyo POS       ${NC}"
echo -e "${CYAN}====================================================${NC}"

# Dapatkan direktori root script
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ----------------------------------------------------------
# 1. TARIK UPDATE DARI GITHUB
# ----------------------------------------------------------
echo -e "\n${YELLOW}📥 [1/4] Menarik kode terbaru dari GitHub...${NC}"
git fetch origin main
git reset --hard origin/main
echo -e "${GREEN}✅ Kode repository berhasil disinkronkan!${NC}"

# ----------------------------------------------------------
# 2. BUILD FRONTEND (REACT VITE)
# ----------------------------------------------------------
echo -e "\n${YELLOW}📦 [2/4] Menginstall dependensi & Build Frontend...${NC}"
if command -v npm &> /dev/null; then
    npm install --silent
    npm run build
    echo -e "${GREEN}✅ Build frontend (dist/) selesai!${NC}"
else
    echo -e "${RED}⚠️ Node.js/npm tidak ditemukan, melewati build frontend.${NC}"
fi

# ----------------------------------------------------------
# 3. COMPILE BACKEND GO (backend/)
# ----------------------------------------------------------
echo -e "\n${YELLOW}⚙️ [3/4] Mengompilasi Backend Go (backend/)...${NC}"
if command -v go &> /dev/null; then
    cd "$ROOT_DIR/backend"
    go build -o backend ./cmd/api/main.go
    cp -f backend server 2>/dev/null || true
    chmod +x backend server 2>/dev/null || true
    mkdir -p "$ROOT_DIR/backend/uploads" "$ROOT_DIR/uploads"
    chmod -R 777 "$ROOT_DIR/backend/uploads" "$ROOT_DIR/uploads" 2>/dev/null || true
    echo -e "${GREEN}✅ Binary backend Go ('backend' & 'server') berhasil di-compile!${NC}"
    cd "$ROOT_DIR"
else
    echo -e "${RED}❌ Compiler Go tidak ditemukan di PATH!${NC}"
fi

# ----------------------------------------------------------
# 4. RESTART BACKEND SERVICE (pos-tokoryo / aaPanel)
# ----------------------------------------------------------
echo -e "\n${YELLOW}🔄 [4/4] Merestart Layanan Backend TokoRyo...${NC}"

RESTARTED=false

if systemctl is-active --quiet "pos-tokoryo" 2>/dev/null; then
    sudo systemctl restart "pos-tokoryo"
    echo -e "${GREEN}✅ Service systemd 'pos-tokoryo' berhasil di-restart!${NC}"
    RESTARTED=true
fi

# Jika bukan via systemd (misal: aaPanel Go Project Daemon / PID)
if [ "$RESTARTED" = false ]; then
    PID=$(pgrep -f "backend/backend|backend/server|tokoryo.web.id/backend" | grep -v "$$" | head -n 1 || true)
    if [ -n "$PID" ]; then
        echo -e "${CYAN}ℹ️ Menemukan proses backend aktif (PID: $PID). Merestart...${NC}"
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✅ Proses backend telah di-trigger restart oleh daemon aaPanel!${NC}"
    else
        echo -e "${YELLOW}ℹ️ Silakan periksa atau restart service di menu Go Project aaPanel / systemctl.${NC}"
    fi
fi

echo -e "\n${CYAN}====================================================${NC}"
echo -e "${GREEN}   🎉 Deployment TokoRyo Selesai & Siap Digunakan   ${NC}"
echo -e "${CYAN}====================================================${NC}\n"
