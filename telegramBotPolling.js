#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const TelegramBotHandler = require('./features/telegramBot/telegramBotHandler');
const axios = require('axios');
const config = require('./config');

class TelegramBotPolling {
  constructor() {
    this.botToken = config.TELEGRAM_BOT_TOKEN;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.botHandler = new TelegramBotHandler();
    this.lastUpdateId = 0;
    this.isRunning = false;
  }

  // Bắt đầu polling
  async start() {
    if (!this.botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN chưa được cấu hình trong .env.local');
      return;
    }

    console.log('🤖 Bắt đầu Telegram Bot Polling...');
    console.log(`📱 Bot: @MinhNgoBinanceNotificationBot`);
    console.log('💬 Bot đang chờ tin nhắn...');
    
    this.isRunning = true;
    this.pollForUpdates();
  }

  // Dừng polling
  stop() {
    console.log('🛑 Đang dừng Telegram Bot Polling...');
    this.isRunning = false;
  }

  // Polling để lấy updates
  async pollForUpdates() {
    while (this.isRunning) {
      try {
        const response = await axios.get(`${this.baseUrl}/getUpdates`, {
          params: {
            offset: this.lastUpdateId + 1,
            timeout: 30, // Long polling
            allowed_updates: ['message']
          }
        });

        if (response.data.ok && response.data.result.length > 0) {
          for (const update of response.data.result) {
            await this.botHandler.handleUpdate(update);
            this.lastUpdateId = update.update_id;
          }
        }
      } catch (error) {
        // Chờ 5 giây trước khi thử lại
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // Test kết nối
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      
      if (response.data.ok) {
        const botInfo = response.data.result;
        console.log('✅ Kết nối bot thành công!');
        console.log(`   Bot: @${botInfo.username}`);
        console.log(`   Name: ${botInfo.first_name}`);
        return true;
      }
    } catch (error) {
      console.error('❌ Lỗi kết nối bot:', error.message);
      return false;
    }
  }
}

// Main function
async function main() {
  const polling = new TelegramBotPolling();
  
  // Test kết nối trước
  const connected = await polling.testConnection();
  if (!connected) {
    console.log('❌ Không thể kết nối với bot. Kiểm tra TELEGRAM_BOT_TOKEN');
    return;
  }
  
  // Bắt đầu polling
  await polling.start();
  
  // Xử lý tín hiệu dừng
  process.on('SIGINT', () => {
    console.log('\n🛑 Nhận tín hiệu dừng...');
    polling.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Nhận tín hiệu dừng...');
    polling.stop();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = TelegramBotPolling;
