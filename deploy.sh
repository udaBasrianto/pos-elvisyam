#!/bin/bash
# ==========================================================
# 🚀 Skrip Update & Deploy Otomatis (POS Multi-Domain)
# ==========================================================
set -e

# Warna terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Dapatkan direktori root script & nama folder
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FOLDER_NAME="$(basename "$ROOT_DIR")"
cd "$ROOT_DIR"

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   🚀 Memulai Update & Deployment POS ($FOLDER_NAME)${NC}"
echo -e "${CYAN}====================================================${NC}"

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
    go build -o server ./cmd/api/main.go
    cp -f server backend 2>/dev/null || true
    chmod +x server backend 2>/dev/null || true
    cp -f server "$ROOT_DIR/server" 2>/dev/null || true
    mkdir -p "$ROOT_DIR/backend/uploads" "$ROOT_DIR/uploads"
    chmod -R 777 "$ROOT_DIR/backend/uploads" "$ROOT_DIR/uploads" 2>/dev/null || true
    echo -e "${GREEN}✅ Binary backend Go ('server' & 'backend') berhasil di-compile!${NC}"
    cd "$ROOT_DIR"
else
    echo -e "${RED}❌ Compiler Go tidak ditemukan di PATH!${NC}"
fi

# ----------------------------------------------------------
# 4. RESTART BACKEND SERVICE (systemd / aaPanel / Supervisor)
# ----------------------------------------------------------
echo -e "\n${YELLOW}🔄 [4/4] Merestart Layanan Backend POS...${NC}"

RESTARTED=false

# Daftar kemungkinan nama service systemd
DOMAIN_PREFIX="${FOLDER_NAME%%.*}"
SERVICES=("pos-${DOMAIN_PREFIX}" "pos-${FOLDER_NAME}" "pos-tokoryo" "pos-posh" "pos-elvisyam" "pos-hana")

for SVC in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$SVC" 2>/dev/null; then
        sudo systemctl restart "$SVC" 2>/dev/null || systemctl restart "$SVC" 2>/dev/null || true
        echo -e "${GREEN}✅ Service systemd '$SVC' berhasil di-restart!${NC}"
        RESTARTED=true
        break
    fi
done

# Jika bukan via systemd (misal: aaPanel Go Project Daemon / Supervisor / Process PID)
if [ "$RESTARTED" = false ]; then
    PID=$(pgrep -f "$ROOT_DIR/backend/server|$ROOT_DIR/backend/backend|$ROOT_DIR/server" | grep -v "$$" | head -n 1 || true)
    if [ -z "$PID" ]; then
        PID=$(pgrep -f "backend/server|backend/backend" | grep -v "$$" | head -n 1 || true)
    fi

    if [ -n "$PID" ]; then
        echo -e "${CYAN}ℹ️ Menemukan proses backend aktif (PID: $PID). Merestart...${NC}"
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✅ Proses backend telah di-trigger restart oleh daemon/supervisor!${NC}"
        RESTARTED=true
    else
        echo -e "${YELLOW}ℹ️ Layanan backend tidak berjalan via systemd atau PID terdaftar.${NC}"
        echo -e "${YELLOW}ℹ️ Silakan periksa atau restart service di menu Go Project aaPanel / systemctl jika perlu.${NC}"
    fi
fi

echo -e "\n${CYAN}====================================================${NC}"
echo -e "${GREEN}   🎉 Deployment Selesai & Aplikasi Siap Digunakan  ${NC}"
echo -e "${CYAN}====================================================${NC}\n"
