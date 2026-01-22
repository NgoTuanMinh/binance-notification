# 🚀 Hướng dẫn Setup Dự án Binance Tracker trên Server Mới

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn setup dự án Binance Tracker từ đầu trên một server Ubuntu mới (chưa có gì cài đặt).

## 🖥️ Yêu cầu Server

- **OS**: Ubuntu 20.04+ hoặc Ubuntu 22.04 (khuyến nghị)
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB+)
- **CPU**: Tối thiểu 2 cores
- **Storage**: Tối thiểu 20GB
- **Network**: Có kết nối internet

---

## 📝 Bước 1: Kết nối và Cập nhật Server

### 1.1. Kết nối SSH vào server

```bash
ssh root@your-server-ip
# hoặc
ssh your-username@your-server-ip
```

### 1.2. Cập nhật hệ thống

```bash
# Cập nhật danh sách package
sudo apt update

# Nâng cấp các package hiện có
sudo apt upgrade -y

# Cài đặt các công cụ cơ bản
sudo apt install -y curl wget git build-essential
```

---

## 📦 Bước 2: Cài đặt Git

### 2.1. Kiểm tra Git đã cài chưa

```bash
git --version
```

Nếu chưa có, cài đặt:

```bash
sudo apt install -y git
```

### 2.2. Cấu hình Git (tùy chọn nhưng khuyến nghị)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 🟢 Bước 3: Cài đặt Node.js

### 3.1. Cài đặt Node.js 18.x (LTS)

```bash
# Tải script cài đặt Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Cài đặt Node.js
sudo apt-get install -y nodejs
```

### 3.2. Kiểm tra cài đặt

```bash
# Kiểm tra phiên bản Node.js
node --version
# Kết quả mong đợi: v18.x.x hoặc cao hơn

# Kiểm tra phiên bản npm
npm --version
# Kết quả mong đợi: 9.x.x hoặc cao hơn
```

---

## 🔧 Bước 4: Cài đặt PM2 (Process Manager)

PM2 giúp quản lý và chạy ứng dụng Node.js tự động.

```bash
# Cài đặt PM2 globally
sudo npm install -g pm2

# Kiểm tra cài đặt
pm2 --version
```

---

## 🌐 Bước 5: Cài đặt Nginx (Reverse Proxy)

### 5.1. Cài đặt Nginx

```bash
sudo apt install -y nginx
```

### 5.2. Khởi động và bật tự động khởi động

```bash
# Khởi động Nginx
sudo systemctl start nginx

# Bật tự động khởi động khi reboot
sudo systemctl enable nginx

# Kiểm tra trạng thái
sudo systemctl status nginx
```

### 5.3. Cấu hình Firewall (UFW)

```bash
# Cài đặt UFW nếu chưa có
sudo apt install -y ufw

# Cho phép SSH
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Cho phép HTTP và HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Kích hoạt firewall
sudo ufw --force enable

# Kiểm tra trạng thái
sudo ufw status
```

---

## 📥 Bước 6: Clone Dự án từ Git

### 6.1. Tạo thư mục cho dự án

```bash
# Tạo thư mục (có thể thay đổi đường dẫn tùy ý)
sudo mkdir -p /home/deploy/binance-tracker

# Tạo user deploy nếu chưa có
sudo adduser --disabled-password --gecos "" deploy || true

# Cấp quyền cho user deploy
sudo chown -R deploy:deploy /home/deploy/binance-tracker
```

### 6.2. Chuyển sang user deploy

```bash
sudo su - deploy
```

### 6.3. Clone repository

```bash
cd /home/deploy

# Nếu dự án trên GitHub/GitLab (thay YOUR_REPO_URL)
git clone YOUR_REPO_URL binance-tracker

# Hoặc nếu bạn đã có code, có thể upload bằng scp/rsync
# scp -r /local/path deploy@your-server-ip:/home/deploy/binance-tracker
```

### 6.4. Di chuyển vào thư mục dự án

```bash
cd binance-tracker
```

---

## ⚙️ Bước 7: Cấu hình Environment Variables

### 7.1. Tạo file .env.local

```bash
# Copy từ file mẫu
cp env.example .env.local

# Chỉnh sửa file
nano .env.local
```

### 7.2. Điền thông tin vào .env.local

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_NOTIFICATION_CHAT_ID=your_notification_chat_id_here
TELEGRAM_BOT_CHAT_ID=your_bot_chat_id_here

# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3010
NODE_ENV=production

# Binance API Configuration
BINANCE_API_BASE_URL=https://api.binance.com
```

**Lưu ý**: Thay thế các giá trị `your_*_here` bằng giá trị thực tế của bạn.

### 7.3. Lấy API Keys

#### Telegram Bot Token:
1. Mở Telegram, tìm [@BotFather](https://t.me/BotFather)
2. Gửi lệnh `/newbot` và làm theo hướng dẫn
3. Copy token được cung cấp

#### Telegram Chat ID:
1. Gửi tin nhắn bất kỳ cho bot vừa tạo
2. Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Tìm `chat.id` trong response JSON

#### Gemini API Key:
1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Tạo API key mới
3. Copy key được cung cấp

### 7.4. Lưu file

Nhấn `Ctrl + X`, sau đó `Y`, rồi `Enter` để lưu.

---

## 📚 Bước 8: Cài đặt Dependencies

### 8.1. Cài đặt npm packages

```bash
# Đảm bảo đang ở trong thư mục dự án
cd /home/deploy/binance-tracker

# Cài đặt dependencies
npm install --production
```

Nếu gặp lỗi permission, chạy:

```bash
sudo chown -R deploy:deploy /home/deploy/binance-tracker
npm install --production
```

---

## 🚀 Bước 9: Chạy Ứng dụng với PM2

### 9.1. Tạo thư mục logs

```bash
mkdir -p logs
```

### 9.2. Khởi động ứng dụng với PM2

```bash
# Khởi động tất cả services
pm2 start ecosystem.config.js --env production

# Lưu cấu hình PM2 để tự động khởi động khi reboot
pm2 save

# Thiết lập PM2 tự động khởi động khi server reboot
pm2 startup
# Chạy lệnh được hiển thị (thường là sudo ...)
```

### 9.3. Kiểm tra trạng thái

```bash
# Xem trạng thái các process
pm2 status

# Xem logs
pm2 logs

# Xem logs của từng service
pm2 logs binance-tracker
pm2 logs volume-monitor
pm2 logs telegram-bot
```

---

## 🔒 Bước 10: Cấu hình Security (Tùy chọn nhưng Khuyến nghị)

### 10.1. Chạy script setup security

```bash
# Quay lại user root hoặc dùng sudo
exit  # Nếu đang ở user deploy
# hoặc
sudo su

# Di chuyển vào thư mục dự án
cd /home/deploy/binance-tracker

# Cấp quyền thực thi
chmod +x setup-security.sh

# Chạy script
sudo ./setup-security.sh
```

Script này sẽ:
- Cấu hình firewall (UFW)
- Cài đặt và cấu hình fail2ban
- Thiết lập automatic security updates
- Tạo user deploy nếu chưa có

---

## 🌍 Bước 11: Cấu hình Nginx Reverse Proxy

### 11.1. Tạo file cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/binance-tracker
```

### 11.2. Thêm nội dung sau (thay `your-domain.com` bằng domain của bạn):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Logs
    access_log /var/log/nginx/binance-tracker-access.log;
    error_log /var/log/nginx/binance-tracker-error.log;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3010/health;
        access_log off;
    }
}
```

### 11.3. Kích hoạt site

```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/binance-tracker /etc/nginx/sites-enabled/

# Xóa default site (tùy chọn)
sudo rm /etc/nginx/sites-enabled/default

# Test cấu hình Nginx
sudo nginx -t

# Nếu test thành công, reload Nginx
sudo systemctl reload nginx
```

### 11.4. Nếu không có domain (chỉ dùng IP)

Sửa file cấu hình:

```nginx
server {
    listen 80;
    server_name _;  # Chấp nhận mọi domain/IP

    # ... phần còn lại giống như trên
}
```

---

## 🔐 Bước 12: Cài đặt SSL Certificate (Nếu có Domain)

### 12.1. Cài đặt Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 12.2. Lấy SSL certificate

```bash
# Thay your-domain.com và your-email@example.com
sudo certbot --nginx -d your-domain.com -d www.your-domain.com --email your-email@example.com --agree-tos --non-interactive
```

### 12.3. Test auto-renewal

```bash
sudo certbot renew --dry-run
```

---

## ✅ Bước 13: Kiểm tra và Test

### 13.1. Kiểm tra PM2 processes

```bash
pm2 status
```

Tất cả processes phải có status `online` (màu xanh).

### 13.2. Test API endpoints

```bash
# Test health endpoint (từ server)
curl http://localhost:3010/health

# Test từ bên ngoài (thay your-domain.com hoặc IP)
curl http://your-domain.com/health
# hoặc
curl http://your-server-ip/health
```

### 13.3. Test Telegram Bot

```bash
# Test kết nối
curl http://localhost:3010/api/telegram-bot/test
```

### 13.4. Kiểm tra logs

```bash
# Xem logs PM2
pm2 logs

# Xem logs Nginx
sudo tail -f /var/log/nginx/binance-tracker-access.log
sudo tail -f /var/log/nginx/binance-tracker-error.log
```

---

## 📊 Bước 14: Monitoring và Maintenance

### 14.1. Các lệnh PM2 hữu ích

```bash
# Xem trạng thái
pm2 status

# Xem logs real-time
pm2 logs

# Restart tất cả
pm2 restart all

# Restart một service cụ thể
pm2 restart binance-tracker

# Stop tất cả
pm2 stop all

# Xem thông tin chi tiết
pm2 info binance-tracker

# Xem monitoring
pm2 monit
```

### 14.2. Kiểm tra tài nguyên hệ thống

```bash
# Cài đặt htop (nếu chưa có)
sudo apt install -y htop

# Xem tài nguyên
htop
```

### 14.3. Xem logs ứng dụng

```bash
# Logs trong thư mục dự án
tail -f /home/deploy/binance-tracker/logs/combined.log
tail -f /home/deploy/binance-tracker/logs/error.log
```

---

## 🔄 Bước 15: Update Code (Khi cần)

### 15.1. Pull code mới từ Git

```bash
cd /home/deploy/binance-tracker

# Pull code mới
git pull origin main
# hoặc
git pull origin develop

# Cài đặt dependencies mới (nếu có)
npm install --production

# Restart PM2
pm2 restart all
```

---

## 🚨 Troubleshooting

### Lỗi: PM2 processes không chạy

```bash
# Kiểm tra logs
pm2 logs

# Kiểm tra .env.local
cat .env.local

# Restart
pm2 restart all
```

### Lỗi: Port 3010 đã được sử dụng

```bash
# Kiểm tra process đang dùng port
sudo lsof -i :3010

# Kill process (thay PID)
sudo kill -9 PID
```

### Lỗi: Nginx không hoạt động

```bash
# Test config
sudo nginx -t

# Xem logs
sudo tail -f /var/log/nginx/error.log

# Restart
sudo systemctl restart nginx
```

### Lỗi: Không kết nối được API

```bash
# Kiểm tra firewall
sudo ufw status

# Kiểm tra PM2
pm2 status

# Test local
curl http://localhost:3010/health
```

### Lỗi: Telegram Bot không hoạt động

```bash
# Kiểm tra token trong .env.local
cat .env.local | grep TELEGRAM

# Test API
curl http://localhost:3010/api/telegram-bot/test

# Xem logs
pm2 logs telegram-bot
```

---

## 📝 Checklist Setup Hoàn chỉnh

- [ ] Server đã được cập nhật (`apt update && apt upgrade`)
- [ ] Git đã được cài đặt
- [ ] Node.js 18+ đã được cài đặt
- [ ] PM2 đã được cài đặt
- [ ] Nginx đã được cài đặt và cấu hình
- [ ] Firewall (UFW) đã được cấu hình
- [ ] Dự án đã được clone/upload
- [ ] File `.env.local` đã được tạo và điền đầy đủ
- [ ] Dependencies đã được cài đặt (`npm install`)
- [ ] PM2 processes đã chạy (`pm2 status` hiển thị online)
- [ ] Nginx đã được cấu hình reverse proxy
- [ ] SSL certificate đã được cài đặt (nếu có domain)
- [ ] Health endpoint hoạt động (`/health`)
- [ ] Telegram Bot hoạt động
- [ ] Logs đang được ghi đúng

---

## 🎯 Kết quả Mong đợi

Sau khi hoàn thành tất cả các bước:

1. ✅ Server chạy trên port 3010 (internal)
2. ✅ Nginx reverse proxy từ port 80/443
3. ✅ PM2 quản lý 3 processes:
   - `binance-tracker` (main server)
   - `volume-monitor` (volume monitoring)
   - `telegram-bot` (Telegram bot)
4. ✅ Tự động khởi động khi server reboot
5. ✅ Logs được lưu trong `/home/deploy/binance-tracker/logs/`
6. ✅ SSL certificate (nếu có domain)
7. ✅ Security đã được cấu hình

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra logs: `pm2 logs`
2. Kiểm tra status: `pm2 status`
3. Kiểm tra Nginx: `sudo systemctl status nginx`
4. Kiểm tra firewall: `sudo ufw status`
5. Xem logs ứng dụng: `tail -f logs/error.log`

---

**Chúc bạn setup thành công! 🎉**
