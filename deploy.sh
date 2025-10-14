#!/bin/bash

# Deployment script for Binance Tracker
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_error ".env.local file not found!"
    print_warning "Please create .env.local file with your configuration"
    exit 1
fi

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs

# Install dependencies
print_status "Installing dependencies..."
npm install --production

# Stop existing PM2 processes
print_status "Stopping existing PM2 processes..."
pm2 stop ecosystem.config.js || true
pm2 delete ecosystem.config.js || true

# Start applications with PM2
print_status "Starting applications with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup || true

# Show status
print_status "Current PM2 status:"
pm2 status

# Show logs
print_status "Recent logs:"
pm2 logs --lines 20

print_status "✅ Deployment completed successfully!"
print_status "🌐 Server should be running on port 3010"
print_status "📊 Check status with: pm2 status"
print_status "📝 View logs with: pm2 logs"
print_status "🔄 Restart with: pm2 restart all"
