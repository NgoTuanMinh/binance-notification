#!/bin/bash

# Security setup script for Binance Tracker VPS
# Run this script after initial VPS setup

set -e

echo "🔒 Setting up security for VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential security packages
print_status "Installing security packages..."
sudo apt install -y ufw fail2ban unattended-upgrades

# Configure UFW (Uncomplicated Firewall)
print_status "Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if you changed SSH port)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Node.js application port (internal only)
sudo ufw allow from 127.0.0.1 to any port 3010

# Enable firewall
sudo ufw --force enable

# Configure fail2ban
print_status "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create fail2ban jail for SSH
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
EOF

# Restart fail2ban
sudo systemctl restart fail2ban

# Configure automatic security updates
print_status "Configuring automatic security updates..."
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# Enable unattended upgrades
sudo systemctl enable unattended-upgrades
sudo systemctl start unattended-upgrades

# Create non-root user (if not exists)
if ! id "deploy" &>/dev/null; then
    print_status "Creating deploy user..."
    sudo adduser --disabled-password --gecos "" deploy
    sudo usermod -aG sudo deploy
    sudo usermod -aG www-data deploy
    
    # Setup SSH key for deploy user
    sudo mkdir -p /home/deploy/.ssh
    sudo chmod 700 /home/deploy/.ssh
    sudo chown deploy:deploy /home/deploy/.ssh
    
    print_warning "Please add your SSH public key to /home/deploy/.ssh/authorized_keys"
    print_warning "Then you can login as deploy user and disable root login"
fi

# Set proper permissions for application directory
if [ -d "/home/deploy/binance-tracker" ]; then
    sudo chown -R deploy:deploy /home/deploy/binance-tracker
    sudo chmod -R 755 /home/deploy/binance-tracker
fi

# Configure log rotation
print_status "Configuring log rotation..."
sudo tee /etc/logrotate.d/binance-tracker > /dev/null <<EOF
/home/deploy/binance-tracker/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Show security status
print_status "Security setup completed!"
print_status "Firewall status:"
sudo ufw status

print_status "Fail2ban status:"
sudo fail2ban-client status

print_status "✅ Security configuration completed!"
print_warning "Remember to:"
print_warning "1. Add your SSH key to /home/deploy/.ssh/authorized_keys"
print_warning "2. Test SSH connection as deploy user"
print_warning "3. Disable root login in /etc/ssh/sshd_config"
print_warning "4. Restart SSH service after changes"
