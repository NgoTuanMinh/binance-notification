#!/bin/bash

# CI/CD Deployment Script for Binance Tracker
# This script handles automated deployment with rollback capability

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="binance-tracker"
DEPLOY_USER="deploy"
DEPLOY_DIR="/home/deploy/$APP_NAME"
BACKUP_DIR="/home/deploy/backups"
LOG_FILE="/var/log/cicd-deploy.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
    log_message "INFO: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log_message "WARNING: $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log_message "ERROR: $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log_message "INFO: $1"
}

# Function to send Telegram notification
send_telegram_notification() {
    local message="$1"
    local bot_token="${TELEGRAM_BOT_TOKEN}"
    local chat_id="${TELEGRAM_CHAT_ID}"
    
    if [ -n "$bot_token" ] && [ -n "$chat_id" ]; then
        curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendMessage" \
            -d chat_id="$chat_id" \
            -d text="$message" \
            -d parse_mode="HTML" > /dev/null
    fi
}

# Function to create backup
create_backup() {
    local backup_name="$APP_NAME-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    print_info "Creating backup: $backup_name"
    
    if [ -d "$DEPLOY_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        cp -r "$DEPLOY_DIR" "$backup_path"
        print_status "Backup created: $backup_path"
        echo "$backup_path"
    else
        print_warning "No existing deployment found to backup"
        echo ""
    fi
}

# Function to rollback
rollback() {
    local backup_path="$1"
    
    if [ -z "$backup_path" ] || [ ! -d "$backup_path" ]; then
        print_error "No valid backup found for rollback"
        return 1
    fi
    
    print_warning "Starting rollback to: $backup_path"
    
    # Stop current processes
    pm2 stop ecosystem.config.js || true
    pm2 delete ecosystem.config.js || true
    
    # Remove current deployment
    rm -rf "$DEPLOY_DIR"
    
    # Restore from backup
    mv "$backup_path" "$DEPLOY_DIR"
    
    # Start application
    cd "$DEPLOY_DIR"
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    # Wait and check health
    sleep 10
    if curl -f http://localhost:3010/health > /dev/null 2>&1; then
        print_status "✅ Rollback successful"
        send_telegram_notification "🔄 <b>Rollback Successful</b>%0A%0A📊 Application: Binance Tracker%0A🌐 Environment: Production%0A⏰ Time: $(date)%0A✅ Status: Healthy"
        return 0
    else
        print_error "❌ Rollback failed"
        send_telegram_notification "🚨 <b>Rollback Failed</b>%0A%0A📊 Application: Binance Tracker%0A🌐 Environment: Production%0A⏰ Time: $(date)%0A❌ Status: Unhealthy"
        return 1
    fi
}

# Function to deploy application
deploy_application() {
    local package_file="$1"
    local environment="$2"
    
    print_info "Starting deployment for environment: $environment"
    
    # Create backup before deployment
    local backup_path=$(create_backup)
    
    # Stop existing processes
    print_info "Stopping existing processes..."
    pm2 stop ecosystem.config.js || true
    pm2 delete ecosystem.config.js || true
    
    # Prepare deployment directory
    print_info "Preparing deployment directory..."
    mkdir -p "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    
    # Clean old files (keep logs and .env.local)
    print_info "Cleaning old files..."
    find . -maxdepth 1 -type f ! -name '*.log' ! -name '.env.local' -delete 2>/dev/null || true
    rm -rf features/ server.js package.json package-lock.json ecosystem.config.js 2>/dev/null || true
    
    # Extract new package
    print_info "Extracting deployment package..."
    tar -xzf "$package_file"
    rm "$package_file"
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm ci --production
    
    # Set proper permissions
    print_info "Setting permissions..."
    chown -R "$DEPLOY_USER:$DEPLOY_USER" .
    chmod +x *.sh 2>/dev/null || true
    
    # Start application
    print_info "Starting application..."
    pm2 start ecosystem.config.js --env "$environment"
    pm2 save
    
    # Wait for application to start
    print_info "Waiting for application to start..."
    sleep 15
    
    # Health check
    print_info "Performing health check..."
    if curl -f http://localhost:3010/health > /dev/null 2>&1; then
        print_status "✅ Deployment successful"
        send_telegram_notification "🚀 <b>Deployment Successful</b>%0A%0A📊 Application: Binance Tracker%0A🌐 Environment: $environment%0A⏰ Time: $(date)%0A✅ Status: Healthy"
        
        # Clean up old backups (keep last 5)
        print_info "Cleaning up old backups..."
        ls -t "$BACKUP_DIR"/$APP_NAME-backup-* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
        
        return 0
    else
        print_error "❌ Deployment failed - health check failed"
        
        # Attempt rollback
        print_warning "Attempting rollback..."
        if rollback "$backup_path"; then
            print_status "Rollback completed successfully"
        else
            print_error "Rollback also failed - manual intervention required"
            send_telegram_notification "🚨 <b>Critical Error</b>%0A%0A📊 Application: Binance Tracker%0A🌐 Environment: $environment%0A⏰ Time: $(date)%0A❌ Status: Deployment and rollback failed%0A🔧 Manual intervention required"
        fi
        
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    print_info "Checking system resources..."
    
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    print_info "CPU Usage: ${cpu_usage}%"
    print_info "Memory Usage: ${memory_usage}%"
    print_info "Disk Usage: ${disk_usage}%"
    
    # Check if resources are too high
    if (( $(echo "$cpu_usage > 90" | bc -l) )); then
        print_warning "High CPU usage detected: ${cpu_usage}%"
    fi
    
    if (( $(echo "$memory_usage > 90" | bc -l) )); then
        print_warning "High memory usage detected: ${memory_usage}%"
    fi
    
    if [ "$disk_usage" -gt 90 ]; then
        print_warning "High disk usage detected: ${disk_usage}%"
    fi
}

# Function to show deployment status
show_status() {
    print_info "Current deployment status:"
    
    # PM2 status
    pm2 status
    
    # Application health
    if curl -f http://localhost:3010/health > /dev/null 2>&1; then
        print_status "Application is healthy"
    else
        print_error "Application is not responding"
    fi
    
    # System resources
    check_system_resources
    
    # Recent logs
    print_info "Recent application logs:"
    pm2 logs --lines 10
}

# Main function
main() {
    local command="$1"
    local package_file="$2"
    local environment="${3:-production}"
    
    case "$command" in
        "deploy")
            if [ -z "$package_file" ]; then
                print_error "Package file required for deployment"
                exit 1
            fi
            
            if [ ! -f "$package_file" ]; then
                print_error "Package file not found: $package_file"
                exit 1
            fi
            
            deploy_application "$package_file" "$environment"
            ;;
            
        "rollback")
            local backup_path="$2"
            rollback "$backup_path"
            ;;
            
        "status")
            show_status
            ;;
            
        "backup")
            create_backup
            ;;
            
        *)
            echo "Usage: $0 {deploy|rollback|status|backup} [package_file] [environment]"
            echo ""
            echo "Commands:"
            echo "  deploy <package_file> [environment]  - Deploy application"
            echo "  rollback <backup_path>              - Rollback to backup"
            echo "  status                              - Show current status"
            echo "  backup                              - Create backup"
            echo ""
            echo "Examples:"
            echo "  $0 deploy binance-tracker.tar.gz production"
            echo "  $0 rollback /home/deploy/backups/binance-tracker-backup-20240101-120000"
            echo "  $0 status"
            echo "  $0 backup"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
