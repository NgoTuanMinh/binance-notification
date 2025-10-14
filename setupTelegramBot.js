#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const config = require('./config');

class TelegramBotSetup {
  constructor() {
    this.botToken = config.TELEGRAM_BOT_TOKEN;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.webhookUrl = `https://your-domain.com/api/telegram-bot/webhook`; // Thay đổi domain của bạn
  }

  // Setup webhook cho Telegram Bot
  async setupWebhook() {
    if (!this.botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN chưa được cấu hình trong .env.local');
      return false;
    }

    try {
      console.log('🔧 Đang setup webhook cho Telegram Bot...');
      
      const response = await axios.post(`${this.baseUrl}/setWebhook`, {
        url: this.webhookUrl,
        drop_pending_updates: true
      });

      if (response.data.ok) {
        console.log('✅ Webhook đã được setup thành công!');
        console.log(`📡 Webhook URL: ${this.webhookUrl}`);
        return true;
      } else {
        console.error('❌ Lỗi setup webhook:', response.data.description);
        return false;
      }
    } catch (error) {
      console.error('❌ Lỗi setup webhook:', error.message);
      return false;
    }
  }

  // Xóa webhook
  async deleteWebhook() {
    try {
      console.log('🗑️ Đang xóa webhook...');
      
      const response = await axios.post(`${this.baseUrl}/deleteWebhook`);
      
      if (response.data.ok) {
        console.log('✅ Webhook đã được xóa thành công!');
        return true;
      } else {
        console.error('❌ Lỗi xóa webhook:', response.data.description);
        return false;
      }
    } catch (error) {
      console.error('❌ Lỗi xóa webhook:', error.message);
      return false;
    }
  }

  // Lấy thông tin webhook hiện tại
  async getWebhookInfo() {
    try {
      const response = await axios.get(`${this.baseUrl}/getWebhookInfo`);
      
      if (response.data.ok) {
        const info = response.data.result;
        console.log('📡 Thông tin webhook hiện tại:');
        console.log(`   URL: ${info.url || 'Chưa có'}`);
        console.log(`   Pending updates: ${info.pending_update_count}`);
        console.log(`   Last error: ${info.last_error_message || 'Không có'}`);
        return info;
      }
    } catch (error) {
      console.error('❌ Lỗi lấy thông tin webhook:', error.message);
    }
  }

  // Test bot connection
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      
      if (response.data.ok) {
        const botInfo = response.data.result;
        console.log('✅ Kết nối bot thành công!');
        console.log(`   Bot: @${botInfo.username}`);
        console.log(`   Name: ${botInfo.first_name}`);
        console.log(`   ID: ${botInfo.id}`);
        return true;
      }
    } catch (error) {
      console.error('❌ Lỗi kết nối bot:', error.message);
      return false;
    }
  }

  // Setup commands cho bot
  async setupCommands() {
    try {
      console.log('⚙️ Đang setup commands cho bot...');
      
      const commands = [
        {
          command: 'start',
          description: 'Bắt đầu và hướng dẫn sử dụng'
        },
        {
          command: 'help',
          description: 'Xem hướng dẫn chi tiết'
        },
        {
          command: 'analyze',
          description: 'Phân tích coin (Cú pháp: /analyze SYMBOL TIMEFRAME)'
        }
      ];

      const response = await axios.post(`${this.baseUrl}/setMyCommands`, {
        commands: commands
      });

      if (response.data.ok) {
        console.log('✅ Commands đã được setup thành công!');
        return true;
      } else {
        console.error('❌ Lỗi setup commands:', response.data.description);
        return false;
      }
    } catch (error) {
      console.error('❌ Lỗi setup commands:', error.message);
      return false;
    }
  }
}

// Main function
async function main() {
  const setup = new TelegramBotSetup();
  
  console.log('🤖 Telegram Bot Setup Tool');
  console.log('========================');
  
  // Test connection
  const connected = await setup.testConnection();
  if (!connected) {
    console.log('❌ Không thể kết nối với bot. Kiểm tra TELEGRAM_BOT_TOKEN');
    return;
  }
  
  // Setup commands
  await setup.setupCommands();
  
  // Show webhook info
  await setup.getWebhookInfo();
  
  console.log('\n📝 Hướng dẫn tiếp theo:');
  console.log('1. Thay đổi webhookUrl trong file này thành domain thực của bạn');
  console.log('2. Chạy: node setupTelegramBot.js --setup-webhook');
  console.log('3. Hoặc sử dụng polling mode (không cần webhook)');
  
  // Check command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--setup-webhook')) {
    await setup.setupWebhook();
  } else if (args.includes('--delete-webhook')) {
    await setup.deleteWebhook();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = TelegramBotSetup;
