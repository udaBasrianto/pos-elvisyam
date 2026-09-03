#!/bin/bash
# ==========================================================
# 🚀 Skrip Update & Deploy Otomatis (pos.elvisyam.com)
# ==========================================================
set -e

# Warna terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Dapatkan direktori root script
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   🚀 Memulai Deployment: pos.elvisyam.com          ${NC}"
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

# Deteksi otomatis Node.js & npm di aaPanel / NVM jika belum di PATH
if ! command -v npm &> /dev/null; then
    for node_bin in /www/server/nodejs/v*/bin /root/.nvm/versions/node/v*/bin /usr/local/bin; do
        if [ -x "$node_bin/npm" ]; then
            export PATH="$node_bin:$PATH"
            echo -e "${CYAN}ℹ️ Menemukan Node.js di $node_bin${NC}"
            break
        fi
    done
fi

if command -v npm &> /dev/null; then
    echo -e "${CYAN}ℹ️ Menggunakan: $(command -v npm) (Node $(node -v 2>/dev/null || true))${NC}"
    if [ ! -d "node_modules" ]; then
        echo -e "${CYAN}ℹ️ Menginstall node_modules...${NC}"
        npm install --silent
    fi
    npm run build
    echo -e "${GREEN}✅ Build frontend (dist/) selesai!${NC}"
else
    echo -e "${RED}⚠️ Node.js/npm tidak ditemukan di sistem, melewati build frontend.${NC}"
fi

# ----------------------------------------------------------
# 3. COMPILE BACKEND GO (backend/)
# ----------------------------------------------------------
echo -e "\n${YELLOW}⚙️ [3/4] Mengompilasi Backend Go...${NC}"

# Deteksi otomatis Go compiler jika belum di PATH
if ! command -v go &> /dev/null; then
    for go_bin in /usr/local/go/bin /www/server/go/bin /root/go/bin; do
        if [ -x "$go_bin/go" ]; then
            export PATH="$go_bin:$PATH"
            echo -e "${CYAN}ℹ️ Menemukan Go di $go_bin${NC}"
            break
        fi
    done
fi

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
# 4. RESTART BACKEND SERVICE (pos-elvisyam / tokoryo / aaPanel)
# ----------------------------------------------------------
echo -e "\n${YELLOW}🔄 [4/4] Merestart Layanan Backend...${NC}"

RESTARTED=false

SERVICES=("pos-tokoryo" "tokoryo" "tokoryo.web.id" "pos-elvisyam" "pos-elvisyam.service" "pos-hana" "pos-posh")

for SVC in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$SVC" 2>/dev/null; then
        sudo systemctl restart "$SVC" 2>/dev/null || systemctl restart "$SVC" 2>/dev/null || true
        echo -e "${GREEN}✅ Service systemd '$SVC' berhasil di-restart!${NC}"
        RESTARTED=true
        break
    fi
done

# Fallback jika berjalan via Process PID / aaPanel Go Daemon / Supervisor
if [ "$RESTARTED" = false ]; then
    PID=$(pgrep -f "$ROOT_DIR/backend/server|$ROOT_DIR/backend/backend|$ROOT_DIR/server|tokoryo" | grep -v "$$" | head -n 1 || true)
    if [ -z "$PID" ]; then
        PID=$(pgrep -f "pos.elvisyam.com|tokoryo.web.id" | grep -v "$$" | head -n 1 || true)
    fi

    if [ -n "$PID" ]; then
        echo -e "${CYAN}ℹ️ Menemukan proses backend aktif (PID: $PID). Merestart...${NC}"
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✅ Proses backend telah di-trigger restart oleh daemon/supervisor!${NC}"
        RESTARTED=true
    else
        echo -e "${YELLOW}ℹ️ Silakan periksa atau restart service 'tokoryo' / Go Project di menu aaPanel.${NC}"
    fi
fi

echo -e "\n${CYAN}====================================================${NC}"
echo -e "${GREEN}   🎉 Deployment pos.elvisyam.com Selesai & Aktif! ${NC}"
echo -e "${CYAN}====================================================${NC}\n"
