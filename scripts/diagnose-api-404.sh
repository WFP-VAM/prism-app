#!/bin/bash
#
# API 404 Diagnostic Script
# Helps diagnose why the API is returning 404 errors
#
# Usage: sudo ./scripts/diagnose-api-404.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "$1"
}

log "${BLUE}========================================${NC}"
log "${BLUE}API 404 Diagnostic Script${NC}"
log "${BLUE}========================================${NC}\n"

# 1. Check IP forwarding
log "${GREEN}=== 1. IP Forwarding Status ===${NC}"
IP_FORWARD=$(sysctl net.ipv4.ip_forward 2>/dev/null | awk '{print $3}' || echo "unknown")
log "IP forwarding: $IP_FORWARD"
if [[ "$IP_FORWARD" == "0" ]]; then
    log "${RED}[ISSUE]${NC} IP forwarding is disabled. Docker requires it for container networking!"
    log "${YELLOW}[FIX]${NC} Run: sudo sysctl -w net.ipv4.ip_forward=1"
    log "${YELLOW}[FIX]${NC} Make permanent: echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf"
else
    log "${GREEN}[OK]${NC} IP forwarding is enabled"
fi
log ""

# 2. Check Docker status
log "${GREEN}=== 2. Docker Status ===${NC}"
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        log "${GREEN}[OK]${NC} Docker is running"
        DOCKER_VERSION=$(docker --version)
        log "Docker version: $DOCKER_VERSION"
    else
        log "${RED}[ISSUE]${NC} Docker is installed but not running"
        log "${YELLOW}[FIX]${NC} Start Docker: sudo systemctl start docker"
    fi
else
    log "${RED}[ISSUE]${NC} Docker is not installed"
fi
log ""

# 3. Check Docker containers
log "${GREEN}=== 3. Docker Containers ===${NC}"
if docker info &> /dev/null; then
    log "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || log "${RED}[ERROR]${NC} Failed to list containers"
    
    log "\nAll containers (including stopped):"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || log "${RED}[ERROR]${NC} Failed to list containers"
    
    # Check for API and Traefik containers
    if docker ps | grep -q "api\|traefik"; then
        log "\n${GREEN}[OK]${NC} API/Traefik containers are running"
    else
        log "\n${RED}[ISSUE]${NC} API or Traefik containers are not running"
        log "${YELLOW}[FIX]${NC} Check logs: docker compose logs"
        log "${YELLOW}[FIX]${NC} Restart: cd /home/ubuntu/prism-app/api && source set_envs.sh && docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d"
    fi
else
    log "${RED}[SKIP]${NC} Cannot check containers - Docker not running"
fi
log ""

# 4. Check Traefik network
log "${GREEN}=== 4. Docker Networks ===${NC}"
if docker info &> /dev/null; then
    log "Docker networks:"
    docker network ls || log "${RED}[ERROR]${NC} Failed to list networks"
    
    if docker network ls | grep -q "traefik_default"; then
        log "\n${GREEN}[OK]${NC} traefik_default network exists"
        log "Network details:"
        docker network inspect traefik_default --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || true
    else
        log "\n${RED}[ISSUE]${NC} traefik_default network does not exist"
        log "${YELLOW}[FIX]${NC} Create network: docker network create traefik_default"
    fi
else
    log "${RED}[SKIP]${NC} Cannot check networks - Docker not running"
fi
log ""

# 5. Check Traefik logs
log "${GREEN}=== 5. Traefik Logs (last 20 lines) ===${NC}"
if docker ps | grep -q "traefik"; then
    log "Traefik container logs:"
    docker logs traefik --tail 20 2>&1 | tail -20 || log "${RED}[ERROR]${NC} Failed to get Traefik logs"
else
    log "${YELLOW}[SKIP]${NC} Traefik container not running"
fi
log ""

# 6. Check API container logs
log "${GREEN}=== 6. API Container Logs (last 20 lines) ===${NC}"
if docker ps | grep -q "api"; then
    log "API container logs:"
    docker logs api --tail 20 2>&1 | tail -20 || log "${RED}[ERROR]${NC} Failed to get API logs"
else
    log "${YELLOW}[SKIP]${NC} API container not running"
fi
log ""

# 7. Check port bindings
log "${GREEN}=== 7. Port Bindings ===${NC}"
log "Port 80 (HTTP):"
sudo lsof -i :80 -P -n 2>/dev/null || log "No process listening on port 80"
log "\nPort 443 (HTTPS):"
sudo lsof -i :443 -P -n 2>/dev/null || log "No process listening on port 443"
log "\nPort 8080 (Traefik dashboard):"
sudo lsof -i :8080 -P -n 2>/dev/null || log "No process listening on port 8080"
log ""

# 8. Check Traefik routing configuration
log "${GREEN}=== 8. Traefik Configuration Check ===${NC}"
if [[ -f "/home/ubuntu/prism-app/api/docker-compose.deploy.yml" ]]; then
    log "Checking docker-compose.deploy.yml..."
    if grep -q "traefik.http.routers.whoami" /home/ubuntu/prism-app/api/docker-compose.deploy.yml; then
        log "${YELLOW}[NOTE]${NC} Router name is 'whoami' - this might be incorrect"
        log "${YELLOW}[NOTE]${NC} Consider changing to 'api' for clarity"
    fi
    
    HOSTNAME=$(grep "HOSTNAME" /home/ubuntu/prism-app/api/docker-compose.deploy.yml | head -1 || echo "")
    if [[ -n "$HOSTNAME" ]]; then
        log "Hostname configuration found"
    else
        log "${YELLOW}[NOTE]${NC} HOSTNAME variable should be set in set_envs.sh"
    fi
else
    log "${YELLOW}[SKIP]${NC} docker-compose.deploy.yml not found at expected location"
fi
log ""

# 9. Test API connectivity
log "${GREEN}=== 9. API Connectivity Test ===${NC}"
if docker ps | grep -q "api"; then
    log "Testing API container connectivity..."
    if docker exec api curl -s http://localhost:80/healthcheck 2>/dev/null | grep -q "All good"; then
        log "${GREEN}[OK]${NC} API container responds to healthcheck"
    else
        log "${RED}[ISSUE]${NC} API container does not respond to healthcheck"
        log "${YELLOW}[DEBUG]${NC} Try: docker exec api curl -v http://localhost:80/healthcheck"
    fi
else
    log "${YELLOW}[SKIP]${NC} API container not running"
fi
log ""

# Summary and recommendations
log "${BLUE}========================================${NC}"
log "${BLUE}Summary & Recommendations${NC}"
log "${BLUE}========================================${NC}\n"

ISSUES_FOUND=0

if [[ "$IP_FORWARD" == "0" ]]; then
    log "${RED}[CRITICAL]${NC} IP forwarding is disabled - Docker networking will fail"
    log "  Fix: sudo sysctl -w net.ipv4.ip_forward=1"
    log "  Make permanent: echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if ! docker ps | grep -q "traefik\|api"; then
    log "${RED}[CRITICAL]${NC} API or Traefik containers are not running"
    log "  Fix: cd /home/ubuntu/prism-app/api"
    log "        source set_envs.sh"
    log "        docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [[ $ISSUES_FOUND -eq 0 ]]; then
    log "${GREEN}[OK]${NC} No critical issues found"
    log "\nIf 404 errors persist, check:"
    log "  1. Traefik routing rules match your domain"
    log "  2. API endpoints are correctly configured"
    log "  3. SSL certificates are valid"
    log "  4. Firewall rules allow traffic"
fi

log ""

