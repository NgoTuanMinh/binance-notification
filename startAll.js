#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Khởi động Binance Crypto Analysis System...');
console.log('==============================================');

// Khởi động server
console.log('📡 Đang khởi động Server...');
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe']
});

server.stdout.on('data', (data) => {
  console.log(`[SERVER] ${data.toString().trim()}`);
});

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data.toString().trim()}`);
});

// Đợi server khởi động
setTimeout(() => {
  console.log('🤖 Đang khởi động Telegram Bot...');
  
  // Khởi động Telegram Bot
  const bot = spawn('node', ['telegramBotPolling.js'], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  bot.stdout.on('data', (data) => {
    console.log(`[BOT] ${data.toString().trim()}`);
  });

  bot.stderr.on('data', (data) => {
    console.error(`[BOT ERROR] ${data.toString().trim()}`);
  });

  // Xử lý tín hiệu dừng
  process.on('SIGINT', () => {
    console.log('\n🛑 Đang dừng tất cả services...');
    server.kill('SIGINT');
    bot.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Đang dừng tất cả services...');
    server.kill('SIGTERM');
    bot.kill('SIGTERM');
    process.exit(0);
  });

}, 3000); // Đợi 3 giây để server khởi động

// Xử lý lỗi server
server.on('error', (error) => {
  console.error('❌ Lỗi khởi động server:', error);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server thoát với mã lỗi: ${code}`);
  }
});
