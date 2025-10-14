#!/bin/bash

# Monitoring setup script for Binance Tracker
# This script sets up monitoring and alerting for the application

set -e

echo "📊 Setting up monitoring and logging..."

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

# Install monitoring tools
print_status "Installing monitoring tools..."
sudo apt install -y htop iotop nethogs nload

# Install PM2 monitoring
print_status "Installing PM2 monitoring..."
sudo npm install -g pm2-logrotate

# Configure PM2 log rotation
print_status "Configuring PM2 log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval 0 0 * * *
pm2 set pm2-logrotate:rotateModule true

# Create monitoring script
print_status "Creating monitoring script..."
sudo tee /usr/local/bin/monitor-binance-tracker > /dev/null <<'EOF'
#!/bin/bash

# Binance Tracker Monitoring Script
# Checks application health and sends alerts if needed

LOG_FILE="/var/log/binance-tracker-monitor.log"
APP_URL="http://localhost:3010/health"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${TELEGRAM_NOTIFICATION_CHAT_ID}"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to send Telegram notification
send_telegram_alert() {
    local message="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="🚨 Binance Tracker Alert: $message" \
            -d parse_mode="HTML" > /dev/null
    fi
}

# Check if PM2 processes are running
check_pm2_processes() {
    local processes=("binance-tracker" "volume-monitor" "telegram-bot")
    local failed_processes=()
    
    for process in "${processes[@]}"; do
        if ! pm2 describe "$process" > /dev/null 2>&1; then
            failed_processes+=("$process")
        fi
    done
    
    if [ ${#failed_processes[@]} -gt 0 ]; then
        local message="PM2 processes failed: ${failed_processes[*]}"
        log_message "ERROR: $message"
        send_telegram_alert "$message"
        return 1
    fi
    
    return 0
}

# Check application health endpoint
check_health_endpoint() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" --connect-timeout 10)
    
    if [ "$response" != "200" ]; then
        local message="Health check failed. HTTP Status: $response"
        log_message "ERROR: $message"
        send_telegram_alert "$message"
        return 1
    fi
    
    return 0
}

# Check system resources
check_system_resources() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    # Check if CPU usage is too high
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        local message="High CPU usage: ${cpu_usage}%"
        log_message "WARNING: $message"
        send_telegram_alert "$message"
    fi
    
    # Check if memory usage is too high
    if (( $(echo "$memory_usage > 85" | bc -l) )); then
        local message="High memory usage: ${memory_usage}%"
        log_message "WARNING: $message"
        send_telegram_alert "$message"
    fi
    
    # Check if disk usage is too high
    if [ "$disk_usage" -gt 85 ]; then
        local message="High disk usage: ${disk_usage}%"
        log_message "WARNING: $message"
        send_telegram_alert "$message"
    fi
}

# Main monitoring function
main() {
    log_message "Starting monitoring check..."
    
    # Check PM2 processes
    if ! check_pm2_processes; then
        log_message "PM2 process check failed"
        exit 1
    fi
    
    # Check health endpoint
    if ! check_health_endpoint; then
        log_message "Health endpoint check failed"
        exit 1
    fi
    
    # Check system resources
    check_system_resources
    
    log_message "Monitoring check completed successfully"
}

# Run main function
main "$@"
EOF

sudo chmod +x /usr/local/bin/monitor-binance-tracker

# Create cron job for monitoring
print_status "Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-binance-tracker") | crontab -

# Create log directory and set permissions
print_status "Setting up log directories..."
sudo mkdir -p /var/log/binance-tracker
sudo chown deploy:deploy /var/log/binance-tracker

# Create systemd service for monitoring (optional)
print_status "Creating monitoring service..."
sudo tee /etc/systemd/system/binance-tracker-monitor.service > /dev/null <<EOF
[Unit]
Description=Binance Tracker Monitoring Service
After=network.target

[Service]
Type=oneshot
User=deploy
Group=deploy
ExecStart=/usr/local/bin/monitor-binance-tracker
EnvironmentFile=/home/deploy/binance-tracker/.env.local

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable binance-tracker-monitor.service

# Create log rotation for monitoring logs
print_status "Setting up log rotation for monitoring..."
sudo tee /etc/logrotate.d/binance-tracker-monitor > /dev/null <<EOF
/var/log/binance-tracker-monitor.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
}
EOF

# Install additional monitoring tools
print_status "Installing additional monitoring tools..."
sudo apt install -y bc  # For floating point calculations in monitoring script

# Test monitoring script
print_status "Testing monitoring script..."
if /usr/local/bin/monitor-binance-tracker; then
    print_status "✅ Monitoring script test successful"
else
    print_warning "⚠️ Monitoring script test failed - check configuration"
fi

print_status "✅ Monitoring setup completed!"
print_status "📊 Monitoring features:"
print_status "  - PM2 process monitoring"
print_status "  - Health endpoint checking"
print_status "  - System resource monitoring"
print_status "  - Telegram alerts"
print_status "  - Log rotation"
print_status "  - Cron job every 5 minutes"
print_status ""
print_status "📝 Useful commands:"
print_status "  - View monitoring logs: tail -f /var/log/binance-tracker-monitor.log"
print_status "  - Check PM2 status: pm2 status"
print_status "  - View PM2 logs: pm2 logs"
print_status "  - Manual monitoring: /usr/local/bin/monitor-binance-tracker"
