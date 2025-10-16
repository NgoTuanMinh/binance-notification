require('dotenv').config({ path: '.env.local' });

module.exports = {
  // Cấu hình EMA cho futures trading
  EMA: {
    PERIOD: 200, // EMA 200
    TIME_FRAME: '15m', // Khung 15 phút cho trading ngắn hạn
    CANDLE_COUNT_FOR_EMA: 300 // Số nến để tính EMA (cần nhiều hơn period)
  },

  // Cấu hình coins để monitor (top 20-100)
  COIN_RANK: {
    MIN_RANK: 20,
    MAX_RANK: 100 // Monitor top 20-100 coins
  },

  // Cấu hình market cap filter
  MARKET_CAP: {
    ENABLED: false, // Tắt filter market cap cho futures monitor
    MAX_MARKET_CAP: 1000000000 // 1B nếu bật
  },

  // Cấu hình scheduler - chạy thường xuyên hơn cho trading
  SCHEDULER_INTERVAL_MINUTES: 5, // Chạy mỗi 5 phút

  // Cấu hình cache - cache ngắn hơn cho trading
  CACHE_DURATION_HOURS: 2, // Cache 2 giờ để tránh báo trùng

  // Cấu hình Telegram
  TELEGRAM: {
    ENABLED: true,
    API_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    CHAT_ID: process.env.TELEGRAM_FUTURES_NOTIFICATION_CHAT_ID
  },

  // Cấu hình Binance API
  BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL || 'https://api.binance.com'
};
