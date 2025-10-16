require('dotenv').config({ path: '.env.local' });

module.exports = {
  // Cấu hình EMA
  EMA: {
    PERIOD: 200, // EMA 200
    TIME_FRAME: '4h', // Khung 4h
    CANDLE_COUNT_FOR_EMA: 300 // Số nến để tính EMA (cần nhiều hơn period)
  },

  // Cấu hình coins để monitor
  COIN_RANK: {
    MIN_RANK: 10,
    MAX_RANK: 200 // Monitor top 50 coins
  },

  // Cấu hình market cap filter
  MARKET_CAP: {
    ENABLED: false, // Tắt filter market cap cho EMA monitor
    MAX_MARKET_CAP: 1000000000 // 1B nếu bật
  },

  // Cấu hình scheduler
  SCHEDULER_INTERVAL_MINUTES: 15, // Chạy mỗi 15 phút

  // Cấu hình cache
  CACHE_DURATION_HOURS: 6, // Cache 6 giờ để tránh báo trùng

  // Cấu hình Telegram
  TELEGRAM: {
    ENABLED: true,
    API_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    CHAT_ID: process.env.TELEGRAM_NOTIFICATION_CHAT_ID
  },

  // Cấu hình Binance API
  BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL || 'https://api.binance.com'
};
