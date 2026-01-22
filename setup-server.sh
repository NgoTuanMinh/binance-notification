#!/bin/bash

# Script tự động setup server mới cho Binance Tracker
# Chạy script này trên server Ubuntu mới (chưa có gì cài đặt)
# Usage: sudo ./setup-server.sh

set -e

echo "🚀 Bắt đầu setup server cho Binance Tracker..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "Script này cần chạy với quyền root (sudo)"
   exit 1
fi

# Step 1: Update system
print_info "Bước 1: Cập nhật hệ thống..."
apt update && apt upgrade -y
print_status "Hệ thống đã được cập nhật"

# Step 2: Install basic tools
print_info "Bước 2: Cài đặt các công cụ cơ bản..."
apt install -y curl wget git build-essential
print_status "Các công cụ cơ bản đã được cài đặt"

# Step 3: Install Git
print_info "Bước 3: Kiểm tra và cài đặt Git..."
if command -v git &> /dev/null; then
    print_status "Git đã được cài đặt: $(git --version)"
else
    apt install -y git
    print_status "Git đã được cài đặt: $(git --version)"
fi

# Step 4: Install Node.js 18.x
print_info "Bước 4: Cài đặt Node.js 18.x..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js đã được cài đặt: $NODE_VERSION"
    read -p "Bạn có muốn cài đặt lại Node.js 18.x? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
        print_status "Node.js đã được cài đặt lại: $(node --version)"
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    print_status "Node.js đã được cài đặt: $(node --version)"
fi

# Verify Node.js and npm
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js: $NODE_VERSION"
print_status "npm: $NPM_VERSION"

# Step 5: Install PM2
print_info "Bước 5: Cài đặt PM2..."
if command -v pm2 &> /dev/null; then
    print_status "PM2 đã được cài đặt: $(pm2 --version)"
else
    npm install -g pm2
    print_status "PM2 đã được cài đặt: $(pm2 --version)"
fi

# Step 6: Install Nginx
print_info "Bước 6: Cài đặt Nginx..."
if command -v nginx &> /dev/null; then
    print_status "Nginx đã được cài đặt: $(nginx -v 2>&1)"
else
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_status "Nginx đã được cài đặt và khởi động"
fi

# Step 7: Install UFW and configure firewall
print_info "Bước 7: Cấu hình Firewall (UFW)..."
apt install -y ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from 127.0.0.1 to any port 3010
ufw --force enable
print_status "Firewall đã được cấu hình"

# Step 8: Create deploy user
print_info "Bước 8: Tạo user deploy..."
if id "deploy" &>/dev/null; then
    print_status "User 'deploy' đã tồn tại"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    usermod -aG www-data deploy
    print_status "User 'deploy' đã được tạo"
    print_warning "Hãy thêm SSH key của bạn vào /home/deploy/.ssh/authorized_keys"
fi

# Step 9: Create project directory
print_info "Bước 9: Tạo thư mục dự án..."
PROJECT_DIR="/home/deploy/binance-tracker"
mkdir -p $PROJECT_DIR
chown -R deploy:deploy $PROJECT_DIR
print_status "Thư mục dự án đã được tạo: $PROJECT_DIR"

# Step 10: Install Certbot (optional)
print_info "Bước 10: Cài đặt Certbot (cho SSL)..."
read -p "Bạn có muốn cài đặt Certbot cho SSL? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    apt install -y certbot python3-certbot-nginx
    print_status "Certbot đã được cài đặt"
else
    print_info "Bỏ qua cài đặt Certbot"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_status "✅ Setup cơ bản đã hoàn thành!"
echo ""
print_info "Các bước tiếp theo:"
echo "  1. Clone dự án vào: $PROJECT_DIR"
echo "  2. Tạo file .env.local từ env.example"
echo "  3. Điền các API keys vào .env.local"
echo "  4. Chạy: cd $PROJECT_DIR && npm install --production"
echo "  5. Chạy: pm2 start ecosystem.config.js --env production"
echo "  6. Chạy: pm2 save && pm2 startup"
echo "  7. Cấu hình Nginx reverse proxy"
echo ""
print_info "Xem hướng dẫn chi tiết trong file: SETUP_SERVER_GUIDE.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
