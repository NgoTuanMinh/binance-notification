# 🚀 Hướng dẫn Deploy Binance Tracker lên VPS

## 📋 Tổng quan

Dự án Binance Tracker bao gồm:

- **Server chính**: API endpoints cho coin tracking
- **Volume Monitor**: Theo dõi volume spikes
- **Telegram Bot**: AI analyzer và notifications
- **AI Analyzer**: Phân tích crypto với Gemini AI

## 🛠️ Yêu cầu VPS

### Hardware tối thiểu:

- **RAM**: 2GB (khuyến nghị 4GB+)
- **CPU**: 2 cores
- **Storage**: 20GB+ SSD
- **Bandwidth**: Không giới hạn
- **OS**: Ubuntu 20.04+ hoặc CentOS 8+

### Software cần cài:

- Node.js 18+
- PM2
- Nginx
- Certbot (SSL)

## 🔧 Các bước Deploy

### 1. Chuẩn bị VPS

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt PM2
sudo npm install -g pm2

# Cài đặt Nginx
sudo apt install nginx

# Cài đặt Certbot
sudo apt install certbot python3-certbot-nginx
```

### 2. Upload code lên VPS

```bash
# Tạo thư mục dự án
sudo mkdir -p /home/deploy/binance-tracker
sudo chown deploy:deploy /home/deploy/binance-tracker

# Upload code (sử dụng scp, rsync, hoặc git)
scp -r . deploy@your-vps-ip:/home/deploy/binance-tracker/
```

### 3. Cấu hình Environment

```bash
# Tạo file .env.local
cd /home/deploy/binance-tracker
nano .env.local
```

Nội dung file `.env.local`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_NOTIFICATION_CHAT_ID=your_chat_id
TELEGRAM_BOT_CHAT_ID=your_bot_chat_id

# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key

# Server Configuration
PORT=3010
NODE_ENV=production

# Binance API Configuration
BINANCE_API_BASE_URL=https://api.binance.com
```

### 4. Chạy các script setup

```bash
# Cấu hình security
sudo ./setup-security.sh

# Cấu hình monitoring
./setup-monitoring.sh

# Deploy ứng dụng
./deploy.sh

# Cấu hình domain và SSL (thay your-domain.com)
sudo ./setup-domain-ssl.sh your-domain.com
```

## 🔐 API Keys cần chuẩn bị

### 1. Telegram Bot Token

- Truy cập [@BotFather](https://t.me/BotFather) trên Telegram
- Tạo bot mới với `/newbot`
- Lưu token được cung cấp

### 2. Telegram Chat ID

- Gửi tin nhắn cho bot
- Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
- Lấy `chat.id` từ response

### 3. Gemini AI API Key

- Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
- Tạo API key mới
- Lưu key được cung cấp

## 📊 Monitoring và Logs

### PM2 Commands:

```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs

# Restart tất cả
pm2 restart all

# Stop tất cả
pm2 stop all
```

### Monitoring Script:

```bash
# Chạy monitoring thủ công
/usr/local/bin/monitor-binance-tracker

# Xem monitoring logs
tail -f /var/log/binance-tracker-monitor.log
```

### Application Logs:

```bash
# Xem logs của từng service
pm2 logs binance-tracker
pm2 logs volume-monitor
pm2 logs telegram-bot

# Xem logs trong thư mục
tail -f logs/combined.log
```

## 🌐 Endpoints sau khi deploy

### API Endpoints:

- `https://your-domain.com/api/coins` - Lấy danh sách coins
- `https://your-domain.com/api/coins/:symbol` - Chi tiết coin
- `https://your-domain.com/api/volume-monitor/status` - Trạng thái volume monitor
- `https://your-domain.com/api/telegram-bot/test` - Test Telegram bot
- `https://your-domain.com/health` - Health check

### Telegram Bot Commands:

- `/start` - Khởi động bot
- `/help` - Hướng dẫn sử dụng
- `/analyze BTC/USDT 4h` - Phân tích coin với AI

## 🔧 Troubleshooting

### 1. PM2 processes không chạy

```bash
# Kiểm tra logs
pm2 logs

# Restart processes
pm2 restart all

# Kiểm tra .env.local
cat .env.local
```

### 2. SSL certificate lỗi

```bash
# Kiểm tra certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL
curl -I https://your-domain.com/health
```

### 3. Nginx lỗi

```bash
# Test config
sudo nginx -t

# Reload config
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

### 4. API không hoạt động

```bash
# Kiểm tra port
netstat -tlnp | grep 3010

# Test local endpoint
curl http://localhost:3010/health

# Kiểm tra firewall
sudo ufw status
```

## 📈 Performance Optimization

### 1. PM2 Cluster Mode (nếu cần)

```bash
# Sửa ecosystem.config.js
# Thay đổi instances: 1 thành instances: 'max'
# Thay đổi exec_mode: 'fork' thành exec_mode: 'cluster'
```

### 2. Nginx Caching

```bash
# Thêm vào nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
```

### 3. Log Rotation

```bash
# Logs sẽ tự động rotate hàng ngày
# Giữ logs trong 30 ngày
```

## 🚨 Alerts và Notifications

### Telegram Alerts:

- Volume spikes được phát hiện
- Server downtime
- High CPU/Memory usage
- SSL certificate sắp hết hạn

### Monitoring Features:

- PM2 process monitoring
- Health endpoint checking
- System resource monitoring
- Automatic log rotation
- Cron job chạy mỗi 5 phút

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs: `pm2 logs`
2. Kiểm tra monitoring: `/usr/local/bin/monitor-binance-tracker`
3. Kiểm tra system resources: `htop`
4. Kiểm tra network: `netstat -tlnp`

## 🔄 Updates và Maintenance

### Update code:

```bash
# Pull latest code
git pull origin main

# Reinstall dependencies
npm install --production

# Restart services
pm2 restart all
```

### Backup:

```bash
# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Backup config
cp .env.local .env.local.backup
```

---

**Lưu ý**: Đảm bảo thay thế `your-domain.com` bằng domain thực tế của bạn và cập nhật các API keys trong file `.env.local`.
