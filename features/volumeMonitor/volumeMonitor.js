#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const VolumeMonitorScheduler = require('./volumeMonitorScheduler');
const TelegramService = require('../../telegramService');

console.log('🚀 Khởi động Volume Monitor Standalone...');

// Tạo scheduler instance
const scheduler = new VolumeMonitorScheduler();
const telegramService = new TelegramService();

// Test kết nối trước khi bắt đầu
async function initialize() {
  console.log('🔍 Đang test kết nối...');
  
  // Test Telegram
  const telegramTest = await telegramService.testConnection();
  console.log(`📱 Telegram: ${telegramTest.success ? '✅' : '❌'} ${telegramTest.message}`);
  
  if (!telegramTest.success) {
    console.log('⚠️ Telegram không hoạt động. Volume monitor sẽ chạy nhưng không gửi thông báo.');
  }
  
  // Bắt đầu scheduler
  scheduler.start();
  
  // Xử lý tín hiệu dừng
  process.on('SIGINT', () => {
    console.log('\n🛑 Nhận tín hiệu dừng...');
    scheduler.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Nhận tín hiệu dừng...');
    scheduler.stop();
    process.exit(0);
  });
}

// Khởi động
initialize().catch(error => {
  console.error('❌ Lỗi khởi động:', error);
  process.exit(1);
});
