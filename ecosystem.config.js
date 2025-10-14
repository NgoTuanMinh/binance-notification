module.exports = {
  apps: [
    {
      name: 'binance-tracker',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart
      watch: false,
      max_memory_restart: '1G',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Graceful shutdown
      kill_timeout: 5000,
      
      // Environment variables
      env_file: '.env.local'
    },
    {
      name: 'volume-monitor',
      script: 'features/volumeMonitor/volumeMonitor.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Logging
      log_file: './logs/volume-monitor-combined.log',
      out_file: './logs/volume-monitor-out.log',
      error_file: './logs/volume-monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart
      watch: false,
      max_memory_restart: '512M',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Graceful shutdown
      kill_timeout: 5000,
      
      // Environment variables
      env_file: '.env.local'
    },
    {
      name: 'telegram-bot',
      script: 'telegramBotPolling.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Logging
      log_file: './logs/telegram-bot-combined.log',
      out_file: './logs/telegram-bot-out.log',
      error_file: './logs/telegram-bot-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart
      watch: false,
      max_memory_restart: '256M',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Graceful shutdown
      kill_timeout: 5000,
      
      // Environment variables
      env_file: '.env.local'
    }
  ]
};
