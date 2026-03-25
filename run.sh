#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo ""
echo -e "${BOLD} ================================================${RESET}"
echo -e "${BOLD}  VoyageFuel — Voyage Fuel Planning Application${RESET}"
echo -e "${BOLD} ================================================${RESET}"
echo ""

# ─── Resolve script directory (works when called from any location) ───────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Check Node.js ───────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo -e "${RED} [ERROR] Node.js is not installed.${RESET}"
    echo ""

    # macOS: suggest Homebrew or official installer
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo " Install Node.js using one of these options:"
        echo ""
        echo "   Option 1 — Homebrew (recommended):"
        echo "     brew install node"
        echo ""
        echo "   Option 2 — Official installer:"
        echo "     https://nodejs.org/"
    else
        echo " Install Node.js:"
        echo "   https://nodejs.org/"
        echo ""
        echo "   Or via package manager:"
        echo "   Ubuntu/Debian:  sudo apt install nodejs npm"
        echo "   Fedora:         sudo dnf install nodejs"
        echo "   Arch:           sudo pacman -S nodejs npm"
    fi

    echo ""
    echo " After installing, run this script again."
    exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN} Node.js found: ${NODE_VER}${RESET}"

# ─── Check Node version >= 18 ─────────────────────────────────────────────────
NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo ""
    echo -e "${YELLOW} [WARNING] Node.js ${NODE_VER} is installed, but version 18 or higher is recommended.${RESET}"
    echo " Update Node.js from https://nodejs.org/ for best results."
    echo ""
fi

# ─── Install dependencies if node_modules is missing ─────────────────────────
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${CYAN} Installing dependencies — this may take a minute on first run...${RESET}"
    echo ""
    npm install
    echo ""
    echo -e "${GREEN} Dependencies installed successfully.${RESET}"
fi

# ─── Open browser after server starts ────────────────────────────────────────
open_browser() {
    sleep 2
    local url="http://localhost:5173"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$url"
    elif command -v xdg-open &>/dev/null; then
        xdg-open "$url" &>/dev/null &
    elif command -v gnome-open &>/dev/null; then
        gnome-open "$url" &>/dev/null &
    fi
}

open_browser &

# ─── Start dev server ────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD} Starting VoyageFuel at http://localhost:5173${RESET}"
echo -e " Press ${BOLD}Ctrl+C${RESET} to stop the server."
echo ""

npm run dev
