#!/bin/bash
#
# EC2 System Security Patching Script
# This script performs Ubuntu system updates, kernel updates, and security patches
#
# Usage: sudo ./ec2-security-patch.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be updated without making changes
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="/var/log/ec2-security-patch-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--dry-run]"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

log "${GREEN}========================================${NC}"
log "${GREEN}EC2 System Security Patching Script${NC}"
log "${GREEN}Started at: $(date)${NC}"
log "${GREEN}Dry run: $DRY_RUN${NC}"
log "${GREEN}========================================${NC}"

# Function to run commands with dry-run support
run_cmd() {
    local cmd="$1"
    local description="$2"
    
    log "${YELLOW}[INFO]${NC} $description"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "${YELLOW}[DRY-RUN]${NC} Would run: $cmd"
        return 0
    else
        if eval "$cmd" >> "$LOG_FILE" 2>&1; then
            log "${GREEN}[SUCCESS]${NC} $description"
            return 0
        else
            log "${RED}[ERROR]${NC} Failed: $description"
            return 1
        fi
    fi
}

# 1. Update system package lists
log "\n${GREEN}=== Step 1: Updating package lists ===${NC}"
run_cmd "apt-get update" "Update package lists"

# 2. Show upgradable packages (dry-run mode)
if [[ "$DRY_RUN" == "true" ]]; then
    log "\n${GREEN}=== Step 2: Checking upgradable packages ===${NC}"
    log "${YELLOW}[DRY-RUN]${NC} Packages that would be upgraded:"
    apt list --upgradable 2>/dev/null | head -30 || true
    log ""
fi

# 3. Upgrade all system packages (including security updates)
log "\n${GREEN}=== Step 3: Upgrading system packages ===${NC}"
if [[ "$DRY_RUN" == "true" ]]; then
    log "${YELLOW}[DRY-RUN]${NC} Would run: apt-get upgrade -y"
    log "${YELLOW}[DRY-RUN]${NC} Would run: apt-get dist-upgrade -y"
else
    run_cmd "DEBIAN_FRONTEND=noninteractive apt-get upgrade -y" "Upgrade all system packages"
    run_cmd "DEBIAN_FRONTEND=noninteractive apt-get dist-upgrade -y" "Upgrade packages with dependency changes"
fi

# 4. Install security updates specifically
log "\n${GREEN}=== Step 4: Installing security updates ===${NC}"
if [[ "$DRY_RUN" == "true" ]]; then
    log "${YELLOW}[DRY-RUN]${NC} Would install unattended-upgrades if not present"
    log "${YELLOW}[DRY-RUN]${NC} Would run unattended-upgrade for security patches"
else
    # Install unattended-upgrades if not present
    if ! dpkg -l | grep -q "^ii.*unattended-upgrades"; then
        run_cmd "DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades" "Install unattended-upgrades"
    else
        log "${GREEN}[INFO]${NC} unattended-upgrades is already installed"
    fi
    
    # Run unattended-upgrade for security patches
    run_cmd "DEBIAN_FRONTEND=noninteractive unattended-upgrade -d" "Run unattended-upgrade for security patches"
fi

# 5. Update specific vulnerable packages mentioned in security scan
log "\n${GREEN}=== Step 5: Updating vulnerable packages ===${NC}"
VULNERABLE_PACKAGES=(
    "linux-image-aws"
    "linux-headers-aws"
    "imagemagick"
    "libmagickcore-6.q16-6"
    "libmagickwand-6.q16-6"
    "libmagickcore-6.q16-6-extra"
    "imagemagick-6-common"
    "imagemagick-6.q16"
    "libheif1"
    "libde265-0"
    "libopenexr25"
)

for package in "${VULNERABLE_PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii.*$package"; then
        if [[ "$DRY_RUN" == "true" ]]; then
            CURRENT_VERSION=$(dpkg -l | grep "^ii.*$package" | awk '{print $3}')
            log "${YELLOW}[DRY-RUN]${NC} Would update package: $package (current: $CURRENT_VERSION)"
        else
            run_cmd "apt-get install --only-upgrade -y $package" "Update $package"
        fi
    fi
done

# 6. Clean up unused packages
log "\n${GREEN}=== Step 6: Cleaning up unused packages ===${NC}"
if [[ "$DRY_RUN" == "true" ]]; then
    log "${YELLOW}[DRY-RUN]${NC} Would run: apt-get autoremove -y"
    log "${YELLOW}[DRY-RUN]${NC} Would run: apt-get autoclean"
else
    run_cmd "apt-get autoremove -y" "Remove unused packages"
    run_cmd "apt-get autoclean" "Clean package cache"
fi

# 7. Check IP forwarding (Docker requires it for networking)
log "\n${GREEN}=== Step 7: IP forwarding check ===${NC}"
CURRENT_IP_FORWARD=$(sysctl net.ipv4.ip_forward 2>/dev/null | awk '{print $3}' || echo "0")

# Check if Docker is installed and running
DOCKER_RUNNING=false
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        DOCKER_RUNNING=true
        log "${YELLOW}[INFO]${NC} Docker is installed and running"
    else
        log "${YELLOW}[INFO]${NC} Docker is installed but not running"
    fi
fi

if [[ "$DRY_RUN" == "true" ]]; then
    log "${YELLOW}[INFO]${NC} Current IP forwarding status: $CURRENT_IP_FORWARD"
    if [[ "$DOCKER_RUNNING" == "true" ]]; then
        log "${YELLOW}[WARN]${NC} Docker requires IP forwarding for container networking"
        if [[ "$CURRENT_IP_FORWARD" == "0" ]]; then
            log "${YELLOW}[DRY-RUN]${NC} Would enable IP forwarding for Docker"
        fi
    else
        if [[ "$CURRENT_IP_FORWARD" == "1" ]]; then
            log "${YELLOW}[DRY-RUN]${NC} Would check if IP forwarding is needed before disabling"
        fi
    fi
else
    if [[ "$DOCKER_RUNNING" == "true" ]]; then
        # Docker needs IP forwarding - ensure it's enabled
        if [[ "$CURRENT_IP_FORWARD" == "0" ]]; then
            log "${YELLOW}[WARN]${NC} IP forwarding is disabled but Docker requires it. Enabling..."
            run_cmd "sysctl -w net.ipv4.ip_forward=1" "Enable IP forwarding for Docker"
            
            # Make it permanent
            if grep -q "^net.ipv4.ip_forward=0" /etc/sysctl.conf 2>/dev/null; then
                sed -i 's/^net.ipv4.ip_forward=0/net.ipv4.ip_forward=1/' /etc/sysctl.conf
                log "${GREEN}[SUCCESS]${NC} Updated /etc/sysctl.conf to enable IP forwarding"
            elif ! grep -q "^net.ipv4.ip_forward=" /etc/sysctl.conf 2>/dev/null; then
                echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
                log "${GREEN}[SUCCESS]${NC} Added net.ipv4.ip_forward=1 to /etc/sysctl.conf"
            fi
        else
            log "${GREEN}[INFO]${NC} IP forwarding is enabled (required for Docker)"
        fi
    else
        # Docker not running - can safely disable IP forwarding if enabled
        if [[ "$CURRENT_IP_FORWARD" == "1" ]]; then
            log "${YELLOW}[INFO]${NC} IP forwarding is enabled but Docker is not running"
            log "${YELLOW}[NOTE]${NC} Keeping IP forwarding enabled in case Docker is used later"
            log "${YELLOW}[NOTE]${NC} To disable manually: sysctl -w net.ipv4.ip_forward=0"
        else
            log "${GREEN}[INFO]${NC} IP forwarding is disabled (Docker not in use)"
        fi
    fi
fi

# 8. Check for kernel updates that require reboot
log "\n${GREEN}=== Step 8: Checking for kernel updates ===${NC}"
if [[ "$DRY_RUN" == "true" ]]; then
    log "${YELLOW}[DRY-RUN]${NC} Would check if reboot is required"
    CURRENT_KERNEL=$(uname -r)
    log "${YELLOW}[INFO]${NC} Current kernel: $CURRENT_KERNEL"
else
    CURRENT_KERNEL=$(uname -r)
    INSTALLED_KERNEL=$(dpkg -l | grep "linux-image-aws" | grep "^ii" | awk '{print $3}' | head -1)
    
    log "${YELLOW}[INFO]${NC} Current running kernel: $CURRENT_KERNEL"
    if [[ -n "$INSTALLED_KERNEL" ]]; then
        log "${YELLOW}[INFO]${NC} Latest installed kernel package: $INSTALLED_KERNEL"
    fi
    
    if [[ -f /var/run/reboot-required ]]; then
        log "${YELLOW}[WARN]${NC} System reboot is required for kernel updates"
        log "${YELLOW}[INFO]${NC} Packages requiring reboot:"
        cat /var/run/reboot-required.pkgs 2>/dev/null | tee -a "$LOG_FILE" || true
        log "${YELLOW}[INFO]${NC} Reboot with: sudo reboot"
    else
        log "${GREEN}[INFO]${NC} No reboot required"
    fi
fi

# Summary
log "\n${GREEN}========================================${NC}"
log "${GREEN}System Security Patching Complete${NC}"
log "${GREEN}Finished at: $(date)${NC}"
log "${GREEN}Log file: $LOG_FILE${NC}"
log "${GREEN}========================================${NC}"

if [[ "$DRY_RUN" == "true" ]]; then
    log "\n${YELLOW}This was a dry run. No changes were made.${NC}"
    log "${YELLOW}Run without --dry-run to apply updates.${NC}"
else
    log "\n${GREEN}Summary:${NC}"
    log "  - System packages updated"
    log "  - Security patches applied"
    log "  - Vulnerable packages updated"
    log "  - Log file: $LOG_FILE"
    
    if [[ -f /var/run/reboot-required ]]; then
        log "\n${YELLOW}[ACTION REQUIRED]${NC} System reboot is needed for kernel updates"
        log "${YELLOW}Run: sudo reboot${NC}"
    fi
fi

exit 0
