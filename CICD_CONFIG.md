# CI/CD Environment Configuration

## 🔧 Environment Variables

### Production Environment (.env.local)

```env
# Application Configuration
NODE_ENV=production
PORT=3010

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_production_telegram_bot_token
TELEGRAM_NOTIFICATION_CHAT_ID=your_production_chat_id
TELEGRAM_BOT_CHAT_ID=your_production_bot_chat_id

# AI Configuration
GEMINI_API_KEY=your_production_gemini_api_key

# Binance API Configuration
BINANCE_API_BASE_URL=https://api.binance.com

# CI/CD Configuration
DEPLOY_USER=deploy
DEPLOY_DIR=/home/deploy/binance-tracker
BACKUP_DIR=/home/deploy/backups
```

### Staging Environment (.env.staging)

```env
# Application Configuration
NODE_ENV=staging
PORT=3011

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_staging_telegram_bot_token
TELEGRAM_NOTIFICATION_CHAT_ID=your_staging_chat_id
TELEGRAM_BOT_CHAT_ID=your_staging_bot_chat_id

# AI Configuration
GEMINI_API_KEY=your_staging_gemini_api_key

# Binance API Configuration
BINANCE_API_BASE_URL=https://api.binance.com

# CI/CD Configuration
DEPLOY_USER=deploy
DEPLOY_DIR=/home/deploy/binance-tracker-staging
BACKUP_DIR=/home/deploy/backups
```

## 🌿 Branch Configuration

### Branch Strategy

```
main (production)
├── develop (staging)
├── feature/feature-name
├── hotfix/urgent-fix
└── release/release-version
```

### Branch Protection Rules

#### Main Branch

- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to main branch

#### Develop Branch

- Require pull request reviews
- Require status checks to pass
- Allow force pushes (for hotfixes)

## 🔐 GitHub Secrets Configuration

### Required Secrets

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

### Optional Secrets

```bash
# Additional notification channels
SLACK_WEBHOOK_URL=your-slack-webhook-url
DISCORD_WEBHOOK_URL=your-discord-webhook-url

# Monitoring
DATADOG_API_KEY=your-datadog-api-key
NEW_RELIC_LICENSE_KEY=your-newrelic-license-key
```

## 📊 PM2 Configuration

### Production Ecosystem (ecosystem.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: "binance-tracker",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
      },
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      watch: false,
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 5000,
      env_file: ".env.local",
    },
  ],
};
```

### Staging Ecosystem (ecosystem-staging.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: "binance-tracker-staging",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "staging",
        PORT: 3011,
      },
      log_file: "./logs/staging-combined.log",
      out_file: "./logs/staging-out.log",
      error_file: "./logs/staging-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      watch: false,
      max_memory_restart: "512M",
      min_uptime: "10s",
      max_restarts: 5,
      kill_timeout: 5000,
      env_file: ".env.staging",
    },
  ],
};
```

## 🚀 Deployment Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout develop
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request to develop
```

### 2. Staging Deployment

```bash
# Merge feature to develop
git checkout develop
git merge feature/new-feature
git push origin develop

# GitHub Actions will automatically:
# - Run tests
# - Deploy to staging VPS
# - Send notifications
```

### 3. Production Deployment

```bash
# Merge develop to main
git checkout main
git merge develop
git push origin main

# GitHub Actions will automatically:
# - Run tests
# - Create backup
# - Deploy to production VPS
# - Health check
# - Rollback if failed
# - Send notifications
```

## 📈 Monitoring Configuration

### Health Check Endpoints

- Production: `https://your-domain.com/health`
- Staging: `http://staging-vps-ip:3011/health`

### Monitoring Scripts

```bash
# Production monitoring
/usr/local/bin/monitor-binance-tracker

# Staging monitoring
/usr/local/bin/monitor-binance-tracker-staging
```

### Log Locations

```bash
# Application logs
/home/deploy/binance-tracker/logs/
/home/deploy/binance-tracker-staging/logs/

# System logs
/var/log/binance-tracker-monitor.log
/var/log/cicd-deploy.log
```

## 🔄 Rollback Strategy

### Automatic Rollback

- Triggered when health check fails
- Restores from latest backup
- Sends notification to Telegram

### Manual Rollback

```bash
# List available backups
ls -la /home/deploy/backups/

# Rollback to specific backup
./cicd-deploy.sh rollback /home/deploy/backups/binance-tracker-backup-20240101-120000

# Or use PM2 directly
pm2 stop all
pm2 start ecosystem.config.js --env production
```

## 🛡️ Security Configuration

### SSH Key Management

```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "github-ci-cd-$(date +%Y%m%d)"

# Update authorized_keys on VPS
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..." >> ~/.ssh/authorized_keys

# Update GitHub Secret: PRODUCTION_SSH_KEY
```

### Environment Security

- Never commit `.env.local` or `.env.staging`
- Use GitHub Secrets for sensitive data
- Rotate API keys regularly
- Monitor access logs

## 📝 Testing Configuration

### Test Scripts

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Linting
npm run lint

# Security audit
npm audit
```

### Test Environment

- Use staging environment for testing
- Mock external APIs when possible
- Test rollback procedures regularly

## 🎯 Best Practices

### 1. Code Quality

- Write meaningful commit messages
- Use conventional commits format
- Keep PRs small and focused
- Review code thoroughly

### 2. Deployment Safety

- Always test on staging first
- Use feature flags for new features
- Monitor after deployment
- Keep rollback plan ready

### 3. Monitoring

- Set up alerts for failures
- Monitor system resources
- Track deployment metrics
- Regular health checks

### 4. Documentation

- Keep deployment docs updated
- Document rollback procedures
- Maintain runbooks
- Share knowledge with team

---

**Lưu ý**: Thay thế tất cả placeholder values bằng giá trị thực tế của bạn và cập nhật configuration theo nhu cầu cụ thể.
