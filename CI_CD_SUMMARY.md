# 🚀 GitHub CI/CD Setup hoàn chỉnh cho Binance Tracker

## 📋 Tổng quan

Tôi đã tạo đầy đủ hệ thống CI/CD cho dự án Binance Tracker của bạn với GitHub Actions. Hệ thống này sẽ tự động:

- ✅ **Test code** khi có push/PR
- ✅ **Deploy staging** khi push vào branch `develop`
- ✅ **Deploy production** khi push vào branch `main`
- ✅ **Rollback tự động** nếu deployment fail
- ✅ **Telegram notifications** cho mọi deployment
- ✅ **Backup tự động** trước mỗi deployment

## 📁 Files đã tạo

### 1. GitHub Actions Workflow

- **`.github/workflows/deploy.yml`** - Main CI/CD pipeline

### 2. CI/CD Scripts

- **`cicd-deploy.sh`** - Script deploy tự động với rollback
- **`GITHUB_CICD_GUIDE.md`** - Hướng dẫn setup GitHub CI/CD
- **`CICD_CONFIG.md`** - Cấu hình environment và branches

## 🔧 Các bước setup

### 1. Tạo SSH Key cho CI/CD

```bash
# Tạo SSH key mới (không dùng passphrase)
ssh-keygen -t ed25519 -C "github-ci-cd" -f ~/.ssh/github_ci_cd

# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/github_ci_cd.pub deploy@your-vps-ip

# Copy private key content để thêm vào GitHub Secrets
cat ~/.ssh/github_ci_cd
```

### 2. Cấu hình GitHub Secrets

Vào **Settings** → **Secrets and variables** → **Actions** và thêm:

```bash
# Production VPS
PRODUCTION_HOST=your-production-vps-ip
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=your-private-ssh-key-content
PRODUCTION_PORT=22

# Staging VPS (optional)
STAGING_HOST=your-staging-vps-ip
STAGING_USER=deploy
STAGING_SSH_KEY=your-private-ssh-key-content
STAGING_PORT=22

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

### 3. Setup Branches

```bash
# Tạo develop branch
git checkout -b develop
git push -u origin develop

# Tạo feature branch
git checkout develop
git checkout -b feature/new-feature
git push -u origin feature/new-feature
```

### 4. Environment Files

Tạo file `.env.local` trên VPS:

```env
NODE_ENV=production
PORT=3010
TELEGRAM_BOT_TOKEN=your_production_token
TELEGRAM_NOTIFICATION_CHAT_ID=your_chat_id
TELEGRAM_BOT_CHAT_ID=your_bot_chat_id
GEMINI_API_KEY=your_gemini_key
BINANCE_API_BASE_URL=https://api.binance.com
```

## 🌿 Workflow hoạt động

### 1. Feature Development

```bash
# Tạo feature branch từ develop
git checkout develop
git checkout -b feature/new-feature

# Code và commit
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Tạo PR merge vào develop
```

### 2. Staging Deployment

- Khi merge vào `develop` → Tự động deploy staging
- Port: 3011
- Health check: `http://localhost:3011/health`
- PM2 process: `binance-tracker-staging`

### 3. Production Deployment

- Khi merge vào `main` → Tự động deploy production
- Port: 3010
- Health check: `http://localhost:3010/health`
- PM2 process: `binance-tracker`
- Auto rollback nếu fail

## 📊 Features của CI/CD

### 1. Automated Testing

- Unit tests
- Linting
- Security audit
- Dependency check

### 2. Staging Environment

- Deploy trên port 3011
- Test trước khi production
- Isolated environment

### 3. Production Deployment

- Zero-downtime deployment
- Automatic backup
- Health checks
- Rollback on failure

### 4. Monitoring & Alerts

- Telegram notifications
- Deployment status
- System health monitoring
- Log aggregation

### 5. Backup & Rollback

- Automatic backups
- One-click rollback
- Backup retention (keep last 5)
- Manual rollback support

## 🔄 Manual Commands

### Deploy manually

```bash
# Deploy to staging
git checkout develop
git push origin develop

# Deploy to production
git checkout main
git push origin main
```

### Rollback manually

```bash
# List backups
ls -la /home/deploy/backups/

# Rollback to specific backup
./cicd-deploy.sh rollback /home/deploy/backups/binance-tracker-backup-20240101-120000
```

### Check status

```bash
# Check deployment status
./cicd-deploy.sh status

# Check PM2 status
pm2 status

# Check logs
pm2 logs
```

## 🚨 Troubleshooting

### 1. SSH Connection Issues

```bash
# Test SSH connection
ssh -i ~/.ssh/github_ci_cd deploy@your-vps-ip

# Check SSH key permissions
chmod 600 ~/.ssh/github_ci_cd
```

### 2. Deployment Failures

```bash
# Check GitHub Actions logs
# Go to Actions tab in GitHub repository

# Check VPS logs
tail -f /var/log/cicd-deploy.log
pm2 logs
```

### 3. Health Check Issues

```bash
# Test health endpoint
curl http://localhost:3010/health

# Check PM2 processes
pm2 status
pm2 restart all
```

## 📈 Benefits

### 1. Automation

- No manual deployment
- Consistent deployments
- Reduced human error

### 2. Safety

- Automatic backups
- Rollback capability
- Health checks

### 3. Monitoring

- Real-time notifications
- Deployment tracking
- System monitoring

### 4. Quality

- Automated testing
- Code quality checks
- Security scanning

## 🎯 Next Steps

1. **Setup GitHub Secrets** với thông tin VPS của bạn
2. **Tạo SSH keys** và cấu hình trên VPS
3. **Setup branches** (develop, main)
4. **Test deployment** với staging environment
5. **Deploy production** khi sẵn sàng

## 📞 Support

Nếu gặp vấn đề:

1. Check GitHub Actions logs
2. Check VPS logs: `/var/log/cicd-deploy.log`
3. Test SSH connection
4. Verify GitHub Secrets configuration

---

**Lưu ý**: Đảm bảo thay thế tất cả placeholder values (your-vps-ip, your-ssh-key, etc.) bằng giá trị thực tế của bạn.

Hệ thống CI/CD đã sẵn sàng! Bạn chỉ cần cấu hình GitHub Secrets và SSH keys là có thể bắt đầu sử dụng.
