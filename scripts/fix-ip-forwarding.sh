#!/bin/bash
#
# Quick Fix: Re-enable IP Forwarding for Docker
# Run this if disabling IP forwarding broke Docker networking
#
# Usage: sudo ./scripts/fix-ip-forwarding.sh
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}Re-enabling IP forwarding for Docker...${NC}"

# Enable IP forwarding immediately
sysctl -w net.ipv4.ip_forward=1
echo -e "${GREEN}[OK]${NC} IP forwarding enabled (temporary)"

# Make it permanent
if grep -q "^net.ipv4.ip_forward=0" /etc/sysctl.conf 2>/dev/null; then
    sed -i 's/^net.ipv4.ip_forward=0/net.ipv4.ip_forward=1/' /etc/sysctl.conf
    echo -e "${GREEN}[OK]${NC} Updated /etc/sysctl.conf"
elif ! grep -q "^net.ipv4.ip_forward=1" /etc/sysctl.conf 2>/dev/null; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    echo -e "${GREEN}[OK]${NC} Added net.ipv4.ip_forward=1 to /etc/sysctl.conf"
else
    echo -e "${GREEN}[OK]${NC} IP forwarding already configured in /etc/sysctl.conf"
fi

# Verify
CURRENT=$(sysctl net.ipv4.ip_forward | awk '{print $3}')
if [[ "$CURRENT" == "1" ]]; then
    echo -e "\n${GREEN}Success! IP forwarding is now enabled.${NC}"
    echo -e "${YELLOW}Note:${NC} You may need to restart Docker containers for changes to take effect:"
    echo -e "  cd /home/ubuntu/prism-app/api"
    echo -e "  source set_envs.sh"
    echo -e "  docker compose -f docker-compose.yml -f docker-compose.deploy.yml restart"
else
    echo -e "\n${RED}Error: Failed to enable IP forwarding${NC}"
    exit 1
fi

