# 🔄 GitHub CI/CD Setup Guide

## 📋 Tổng quan CI/CD Pipeline

Pipeline này sẽ tự động:

- ✅ **Test code** khi có push/PR
- ✅ **Deploy staging** khi push vào branch `develop`
- ✅ **Deploy production** khi push vào branch `main`
- ✅ **Rollback tự động** nếu deployment fail
- ✅ **Telegram notifications** cho mọi deployment

## 🔑 GitHub Secrets cần cấu hình

### 1. Truy cập GitHub Secrets

1. Vào repository trên GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### 2. Production Secrets

```bash
# VPS Production
PRODUCTION_HOST=your-production-vps-ip
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=your-private-ssh-key
PRODUCTION_PORT=22

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

### 3. Staging Secrets (Optional)

```bash
# VPS Staging (có thể dùng chung với production)
STAGING_HOST=your-staging-vps-ip
STAGING_USER=deploy
STAGING_SSH_KEY=your-private-ssh-key
STAGING_PORT=22
```

## 🔐 SSH Key Setup

### 1. Tạo SSH Key Pair

```bash
# Tạo SSH key mới (không dùng passphrase cho CI/CD)
ssh-keygen -t ed25519 -C "github-ci-cd" -f ~/.ssh/github_ci_cd

# Hoặc RSA nếu ed25519 không được support
ssh-keygen -t rsa -b 4096 -C "github-ci-cd" -f ~/.ssh/github_ci_cd
```

### 2. Cấu hình trên VPS

```bash
# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/github_ci_cd.pub deploy@your-vps-ip

# Hoặc thủ công
cat ~/.ssh/github_ci_cd.pub >> ~/.ssh/authorized_keys
```

### 3. Thêm vào GitHub Secrets

```bash
# Copy private key content
cat ~/.ssh/github_ci_cd

# Paste vào GitHub Secret: PRODUCTION_SSH_KEY
```

## 🌿 Branch Strategy

### 1. Branch Structure

```
main (production)
├── develop (staging)
├── feature/new-feature
└── hotfix/urgent-fix
```

### 2. Workflow

1. **Feature development**: Tạo branch từ `develop`
2. **Testing**: Merge vào `develop` → Deploy staging
3. **Production**: Merge `develop` vào `main` → Deploy production

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

## 📁 Environment Files

### 1. Production (.env.local)

```env
# Production environment
NODE_ENV=production
PORT=3010

# API Keys
TELEGRAM_BOT_TOKEN=your_production_token
TELEGRAM_NOTIFICATION_CHAT_ID=your_chat_id
TELEGRAM_BOT_CHAT_ID=your_bot_chat_id
GEMINI_API_KEY=your_gemini_key

# Binance API
BINANCE_API_BASE_URL=https://api.binance.com
```

### 2. Staging (.env.staging)

```env
# Staging environment
NODE_ENV=staging
PORT=3011

# API Keys (có thể dùng test keys)
TELEGRAM_BOT_TOKEN=your_staging_token
TELEGRAM_NOTIFICATION_CHAT_ID=your_staging_chat_id
TELEGRAM_BOT_CHAT_ID=your_staging_bot_chat_id
GEMINI_API_KEY=your_staging_gemini_key

# Binance API
BINANCE_API_BASE_URL=https://api.binance.com
```

## 🚀 Deployment Process

### 1. Staging Deployment (develop branch)

- Trigger: Push vào `develop`
- Port: 3011
- Health check: `http://localhost:3011/health`
- PM2 process: `binance-tracker-staging`

### 2. Production Deployment (main branch)

- Trigger: Push vào `main`
- Port: 3010
- Health check: `http://localhost:3010/health`
- PM2 process: `binance-tracker`
- Auto rollback nếu fail

## 📊 Monitoring và Notifications

### 1. Telegram Notifications

- ✅ Deployment success
- ❌ Deployment failure
- 🔄 Rollback notifications

### 2. Health Checks

- Application health endpoint
- PM2 process status
- System resource monitoring

### 3. Logs

- GitHub Actions logs
- PM2 application logs
- System monitoring logs

## 🔧 Troubleshooting

### 1. SSH Connection Issues

```bash
# Test SSH connection
ssh -i ~/.ssh/github_ci_cd deploy@your-vps-ip

# Check SSH key permissions
chmod 600 ~/.ssh/github_ci_cd
chmod 644 ~/.ssh/github_ci_cd.pub
```

### 2. Deployment Failures

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Manual rollback
pm2 stop all
pm2 start ecosystem.config.js --env production
```

### 3. GitHub Actions Issues

- Check GitHub Secrets configuration
- Verify SSH key format
- Check VPS connectivity
- Review GitHub Actions logs

## 📝 Useful Commands

### 1. Local Development

```bash
# Test locally
npm test
npm run lint

# Start development server
npm run dev
```

### 2. Manual Deployment

```bash
# Deploy to staging manually
git checkout develop
git push origin develop

# Deploy to production manually
git checkout main
git push origin main
```

### 3. VPS Management

```bash
# Check deployment status
pm2 status
pm2 logs

# Restart services
pm2 restart all

# Check system resources
htop
df -h
```

## 🎯 Best Practices

### 1. Code Quality

- Always run tests before pushing
- Use meaningful commit messages
- Keep branches small and focused
- Review code before merging

### 2. Deployment Safety

- Test on staging first
- Use feature flags for new features
- Monitor after deployment
- Keep rollback plan ready

### 3. Security

- Never commit secrets to code
- Use environment variables
- Rotate SSH keys regularly
- Monitor access logs

---

**Lưu ý**: Đảm bảo thay thế tất cả placeholder values (your-vps-ip, your-ssh-key, etc.) bằng giá trị thực tế của bạn.
