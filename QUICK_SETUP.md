# ⚡ Quick Setup Guide - Tóm tắt Nhanh

## 🎯 Cho người đã có kinh nghiệm

### 1. Chạy script tự động setup cơ bản

```bash
# Trên server mới, chạy với quyền root
sudo ./setup-server.sh
```

### 2. Clone dự án và cấu hình

```bash
# Chuyển sang user deploy
sudo su - deploy

# Clone dự án (thay YOUR_REPO_URL)
cd /home/deploy
git clone YOUR_REPO_URL binance-tracker
cd binance-tracker

# Tạo .env.local
cp env.example .env.local
nano .env.local  # Điền các API keys

# Cài đặt dependencies
npm install --production

# Tạo thư mục logs
mkdir -p logs
```

### 3. Khởi động với PM2

```bash
# Khởi động tất cả services
pm2 start ecosystem.config.js --env production

# Lưu và tự động khởi động
pm2 save
pm2 startup  # Chạy lệnh được hiển thị
```

### 4. Cấu hình Nginx

```bash
# Tạo file config
sudo nano /etc/nginx/sites-available/binance-tracker
```

Nội dung:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Kích hoạt
sudo ln -s /etc/nginx/sites-available/binance-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL (nếu có domain)

```bash
sudo certbot --nginx -d your-domain.com
```

---

## ✅ Kiểm tra

```bash
# PM2 status
pm2 status

# Test API
curl http://localhost:3010/health

# Xem logs
pm2 logs
```

---

## 📚 Xem hướng dẫn chi tiết

Xem file `SETUP_SERVER_GUIDE.md` để có hướng dẫn đầy đủ từng bước.
