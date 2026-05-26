#!/usr/bin/env bash
# EduN7 — Deploy to a fresh Ubuntu 22.04/24.04 VPS
# Tested on: Oracle Cloud Free Tier (ARM), Hetzner CX32
# Usage: sudo bash deploy.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${GREEN}[+]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }
confirm() { read -rp "$1 [y/N] " r; [[ "${r,,}" == "y" ]]; }

# ── 1. Root check ──────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || error "Run as root: sudo bash deploy.sh"

# ── 2. Dependencies ────────────────────────────────────────────────────────────
info "Installing Docker, Docker Compose, and Certbot..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 certbot curl git

systemctl enable --now docker

# ── 3. Clone repo ──────────────────────────────────────────────────────────────
REPO_DIR="/opt/edun7"
if [[ -d "$REPO_DIR/.git" ]]; then
    info "Repo exists — pulling latest..."
    git -C "$REPO_DIR" pull
else
    read -rp "Git repository URL (or press Enter to skip if files are already here): " REPO_URL
    if [[ -n "$REPO_URL" ]]; then
        git clone "$REPO_URL" "$REPO_DIR"
    fi
fi
cd "${REPO_DIR:-$(pwd)}"

# ── 4. Environment variables ───────────────────────────────────────────────────
info "Configuring environment..."
echo ""
read -rp "Domain name (e.g. edun7.enset.ma): " DOMAIN
read -rp "Google Client ID: " GOOGLE_CLIENT_ID
read -rp "Admin email(s) comma-separated (e.g. prof@enset.ma): " ADMIN_EMAILS
read -rp "Gemini API Key (leave blank if using another provider): " GEMINI_API_KEY
read -rp "Cerebras API Key (leave blank if using another provider): " CEREBRAS_API_KEY

JWT_SECRET=$(openssl rand -hex 32)
info "Generated JWT_SECRET automatically."

cp .env.production.example .env
sed -i "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}|" .env
sed -i "s|VITE_GOOGLE_CLIENT_ID=.*|VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}|" .env
sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
sed -i "s|ADMIN_EMAILS=.*|ADMIN_EMAILS=${ADMIN_EMAILS}|" .env
sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}|" .env
sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=${GEMINI_API_KEY}|" .env
sed -i "s|CEREBRAS_API_KEY=.*|CEREBRAS_API_KEY=${CEREBRAS_API_KEY}|" .env

# ── 5. SSL certificate ─────────────────────────────────────────────────────────
info "Issuing Let's Encrypt certificate for ${DOMAIN}..."
warn "Port 80 must be free (no other web server running)."
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "${ADMIN_EMAILS%%,*}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" || warn "Certbot failed — you can add SSL manually later."

# Update nginx-prod.conf with actual domain
sed -i "s|DOMAIN|${DOMAIN}|g" nginx-prod.conf

# ── 6. Build & launch ──────────────────────────────────────────────────────────
info "Building and starting EduN7..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# ── 7. Certificate renewal cron ────────────────────────────────────────────────
CRON_JOB="0 3 * * 0 certbot renew --quiet && docker compose -f /opt/edun7/docker-compose.yml -f /opt/edun7/docker-compose.prod.yml restart frontend"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_JOB") | crontab -
info "Weekly cert renewal configured."

# ── 8. Health check ────────────────────────────────────────────────────────────
sleep 8
if curl -sf "http://localhost/api/health" > /dev/null; then
    info "Health check passed."
else
    warn "Health check failed — check logs with: docker compose logs backend"
fi

echo ""
echo -e "${GREEN}✓ EduN7 deployed!${NC}"
echo -e "  URL:     https://${DOMAIN}"
echo -e "  Logs:    docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo -e "  Restart: docker compose -f docker-compose.yml -f docker-compose.prod.yml restart"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Add ${DOMAIN} as an Authorized JavaScript origin in Google Cloud Console"
echo "  2. Log in with your admin email: ${ADMIN_EMAILS%%,*}"
echo "  3. Upload shared documents as professor/admin to create course knowledge bases"
