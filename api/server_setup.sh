# Setup an EC2 server for Docker Swarm and Traefik.
sudo apt update
sudo apt install -y awscli make jq

export USE_HOSTNAME=prism-api.ovio.org
sudo hostnamectl set-hostname $USE_HOSTNAME

# Install the latest updates
apt-get update
apt-get upgrade -y

# Download Docker
curl -fsSL get.docker.com -o get-docker.sh
# Install Docker using the stable channel (instead of the default "edge")
CHANNEL=stable sh get-docker.sh
# Remove Docker install script
rm get-docker.sh

# Update docker group to run docker with $USER
sudo groupadd docker
# Add your user to the docker group.
sudo usermod -aG docker $USER

sudo reboot
##### REBOOT for the changes above to take effect ######
