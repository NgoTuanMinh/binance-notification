require('dotenv').config({ path: '.env.local' });

module.exports = {
  PORT: process.env.PORT || 3010,
  BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL || 'https://api.binance.com',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_NOTIFICATION_CHAT_ID: process.env.TELEGRAM_NOTIFICATION_CHAT_ID,
  TELEGRAM_BOT_CHAT_ID: process.env.TELEGRAM_BOT_CHAT_ID,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
};
