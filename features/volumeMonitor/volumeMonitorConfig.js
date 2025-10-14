require('dotenv').config({ path: '.env.local' });

module.exports = {
  // Cấu hình rank coin để kiểm tra
  COIN_RANK: {
    MIN_RANK: 20,  // Top coin từ rank 20
    MAX_RANK: 100  // Đến rank 100
  },

  // Cấu hình market cap filter
  MARKET_CAP: {
    MAX_MARKET_CAP: 1e9,  // Market cap tối đa 1B USD
    ENABLED: true  // Bật/tắt filter market cap
  },

  // Cấu hình khung thời gian
  TIME_FRAME: '15m',  // Khung M15 (có thể thay đổi: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)

  // Cấu hình số lượng nến để tính trung bình
  CANDLE_COUNT_FOR_AVERAGE: 1000,  // Số nến để tính trung bình khối lượng

  // Cấu hình ngưỡng tăng đột biến
  VOLUME_SPIKE_MULTIPLIER: 10,  // Gấp 3.5 lần trung bình

  // Cấu hình thời gian cache để tránh báo trùng
  CACHE_DURATION_HOURS: 4,  // Cache 4 giờ

  // Cấu hình thời gian chạy scheduler
  SCHEDULER_INTERVAL_MINUTES: 15,  // Chạy mỗi 15 phút

  // Cấu hình Telegram
  TELEGRAM: {
    ENABLED: true,
    // Token và Chat ID sẽ được lấy từ .env.local
    API_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    CHAT_ID: process.env.TELEGRAM_NOTIFICATION_CHAT_ID
  },

  // Cấu hình logging
  LOGGING: {
    ENABLED: true,
    LOG_LEVEL: 'info'  // debug, info, warn, error
  }
};
