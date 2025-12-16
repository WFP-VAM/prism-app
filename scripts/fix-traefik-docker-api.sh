#!/bin/bash
#
# Fix Traefik Docker API Version Mismatch
# Upgrades Traefik to a version compatible with Docker API 1.44+
#
# Usage: sudo ./scripts/fix-traefik-docker-api.sh
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "$1"
}

if [[ $EUID -ne 0 ]]; then
    log "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

log "${BLUE}========================================${NC}"
log "${BLUE}Fix Traefik Docker API Version Mismatch${NC}"
log "${BLUE}========================================${NC}\n"

# Check if we're in the right directory
if [[ ! -f "api/docker-compose.deploy.yml" ]]; then
    log "${RED}Error: Must run from project root directory${NC}"
    log "Current directory: $(pwd)"
    exit 1
fi

cd api || exit 1

# Check Docker version
log "${GREEN}=== Checking Docker Version ===${NC}"
DOCKER_VERSION=$(docker --version)
log "Docker version: $DOCKER_VERSION"

DOCKER_API_VERSION=$(docker version --format '{{.Server.APIVersion}}' 2>/dev/null || echo "unknown")
log "Docker API version: $DOCKER_API_VERSION"

if [[ "$DOCKER_API_VERSION" == "unknown" ]]; then
    log "${YELLOW}[WARN]${NC} Could not determine Docker API version"
else
    # Check if API version is 1.44 or higher
    if [[ $(echo "$DOCKER_API_VERSION >= 1.44" | bc -l 2>/dev/null || echo "0") == "1" ]]; then
        log "${GREEN}[OK]${NC} Docker API version is 1.44+ (compatible)"
    else
        log "${YELLOW}[INFO]${NC} Docker API version is below 1.44"
    fi
fi
log ""

# Check current Traefik version
log "${GREEN}=== Checking Current Traefik Version ===${NC}"
CURRENT_TRAEFIK=$(grep "image.*traefik" docker-compose.deploy.yml | head -1 | sed 's/.*traefik://' | sed 's/"//g' || echo "unknown")
log "Current Traefik version in docker-compose.deploy.yml: $CURRENT_TRAEFIK"

if docker ps | grep -q "traefik"; then
    RUNNING_TRAEFIK=$(docker inspect traefik --format '{{.Config.Image}}' 2>/dev/null | sed 's/.*://' || echo "unknown")
    log "Currently running Traefik version: $RUNNING_TRAEFIK"
fi
log ""

# Update Traefik version
log "${GREEN}=== Updating Traefik Version ===${NC}"
log "Updating docker-compose.deploy.yml to use Traefik v2.11+..."

# Backup the file
cp docker-compose.deploy.yml docker-compose.deploy.yml.backup
log "${GREEN}[OK]${NC} Created backup: docker-compose.deploy.yml.backup"

# Update Traefik version to 2.11 (supports Docker API 1.44+)
sed -i 's|image: "traefik:v2\.[0-9]*\.[0-9]*"|image: "traefik:v2.11"|g' docker-compose.deploy.yml
sed -i 's|image: "traefik:v2\.[0-9]*"|image: "traefik:v2.11"|g' docker-compose.deploy.yml

NEW_VERSION=$(grep "image.*traefik" docker-compose.deploy.yml | head -1 | sed 's/.*traefik://' | sed 's/"//g')
log "${GREEN}[OK]${NC} Updated to Traefik version: $NEW_VERSION"
log ""

# Pull new Traefik image
log "${GREEN}=== Pulling New Traefik Image ===${NC}"
if docker pull traefik:v2.11; then
    log "${GREEN}[OK]${NC} Successfully pulled Traefik v2.11"
else
    log "${RED}[ERROR]${NC} Failed to pull Traefik v2.11"
    log "${YELLOW}[INFO]${NC} Restoring backup..."
    mv docker-compose.deploy.yml.backup docker-compose.deploy.yml
    exit 1
fi
log ""

# Restart Traefik
log "${GREEN}=== Restarting Traefik ===${NC}"
log "${YELLOW}[INFO]${NC} Stopping Traefik container..."

if docker ps | grep -q "traefik"; then
    if source set_envs.sh 2>/dev/null; then
        docker compose -f docker-compose.yml -f docker-compose.deploy.yml stop traefik
        log "${GREEN}[OK]${NC} Traefik stopped"
        
        log "${YELLOW}[INFO]${NC} Starting Traefik with new version..."
        docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d traefik
        log "${GREEN}[OK]${NC} Traefik restarted"
    else
        log "${YELLOW}[WARN]${NC} Could not source set_envs.sh"
        log "${YELLOW}[INFO]${NC} You may need to manually restart Traefik:"
        log "  cd /home/ubuntu/prism-app/api"
        log "  source set_envs.sh"
        log "  docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d traefik"
    fi
else
    log "${YELLOW}[INFO]${NC} Traefik container not running"
    log "${YELLOW}[INFO]${NC} Start it with:"
    log "  cd /home/ubuntu/prism-app/api"
    log "  source set_envs.sh"
    log "  docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d traefik"
fi
log ""

# Verify
log "${GREEN}=== Verification ===${NC}"
sleep 3
if docker ps | grep -q "traefik"; then
    NEW_RUNNING=$(docker inspect traefik --format '{{.Config.Image}}' 2>/dev/null | sed 's/.*://' || echo "unknown")
    log "Traefik is running with version: $NEW_RUNNING"
    
    # Check logs for errors
    log "\nChecking Traefik logs for Docker API errors..."
    if docker logs traefik --tail 10 2>&1 | grep -q "Docker API version\|API version"; then
        log "${GREEN}[OK]${NC} No Docker API version errors found in recent logs"
    else
        log "${YELLOW}[INFO]${NC} Check logs manually: docker logs traefik"
    fi
else
    log "${RED}[ERROR]${NC} Traefik is not running"
    log "Check logs: docker logs traefik"
fi

log "\n${BLUE}========================================${NC}"
log "${GREEN}Fix Complete!${NC}"
log "${BLUE}========================================${NC}\n"

log "${YELLOW}Next steps:${NC}"
log "1. Monitor Traefik logs: docker logs -f traefik"
log "2. Test API endpoints to verify 404 errors are resolved"
log "3. If issues persist, check: docker logs api"

