require('dotenv').config({ path: '.env.local' });
const EMAMonitorService = require('./emaMonitorService');
const TelegramService = require('../../telegramService');
const emaConfig = require('./emaMonitorConfig');

class EMAMonitorScheduler {
  constructor() {
    this.emaMonitor = new EMAMonitorService();
    this.telegramService = new TelegramService();
    this.isRunning = false;
    this.intervalId = null;
    this.startTime = null;
    this.runCount = 0;
    this.lastRunTime = null;
    this.nextRunTime = null;
  }

  // Bắt đầu scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ EMA Monitor Scheduler đã đang chạy');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.runCount = 0;

    console.log('🚀 Bắt đầu EMA Monitor Scheduler');
    console.log(`⏰ Chạy mỗi ${emaConfig.SCHEDULER_INTERVAL_MINUTES} phút`);
    let configMessage = `📊 Cấu hình: Rank ${emaConfig.COIN_RANK.MIN_RANK}-${emaConfig.COIN_RANK.MAX_RANK}, EMA ${emaConfig.EMA.PERIOD}, Khung ${emaConfig.EMA.TIME_FRAME}`;
    
    if (emaConfig.MARKET_CAP.ENABLED) {
      configMessage += `, Market cap ≤ ${this.formatNumber(emaConfig.MARKET_CAP.MAX_MARKET_CAP)}`;
    }
    
    console.log(configMessage);

    // Chạy ngay lần đầu
    this.runEMACheck();

    // Thiết lập interval
    this.intervalId = setInterval(() => {
      this.runEMACheck();
    }, emaConfig.SCHEDULER_INTERVAL_MINUTES * 60 * 1000);

    // Gửi thông báo khởi động
    this.telegramService.sendSystemAlert(
      `🚀 **EMA Monitor đã khởi động**\n\n` +
      `⏰ Chạy mỗi: \`${emaConfig.SCHEDULER_INTERVAL_MINUTES}\` phút\n` +
      `📊 Rank: \`${emaConfig.COIN_RANK.MIN_RANK}-${emaConfig.COIN_RANK.MAX_RANK}\`\n` +
      `📈 EMA: \`${emaConfig.EMA.PERIOD}\`\n` +
      `⏱️ Khung: \`${emaConfig.EMA.TIME_FRAME}\`\n` +
      `📅 Thời gian: \`${this.startTime.toLocaleString('vi-VN')}\``
    );
  }

  // Dừng scheduler
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ EMA Monitor Scheduler chưa chạy');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const uptime = this.getUptime();
    console.log('🛑 Đã dừng EMA Monitor Scheduler');
    console.log(`📊 Tổng số lần chạy: ${this.runCount}`);
    console.log(`⏰ Thời gian hoạt động: ${uptime}`);

    // Gửi thông báo dừng
    this.telegramService.sendSystemAlert(
      `🛑 **EMA Monitor đã dừng**\n\n` +
      `📊 Tổng số lần chạy: \`${this.runCount}\`\n` +
      `⏰ Thời gian hoạt động: \`${uptime}\`\n` +
      `📅 Dừng lúc: \`${new Date().toLocaleString('vi-VN')}\``
    );
  }

  // Chạy kiểm tra EMA cross
  async runEMACheck() {
    const runStartTime = new Date();
    this.runCount++;
    this.lastRunTime = runStartTime;
    this.nextRunTime = new Date(runStartTime.getTime() + (emaConfig.SCHEDULER_INTERVAL_MINUTES * 60 * 1000));

    console.log(`\n🔄 [Lần ${this.runCount}] Bắt đầu kiểm tra EMA 200 crosses...`);
    console.log(`⏰ Thời gian: ${runStartTime.toLocaleString('vi-VN')}`);

    try {
      // Kiểm tra EMA crosses
      const emaCrosses = await this.emaMonitor.checkAllCoinsForEMACross();

      const runEndTime = new Date();
      const runDuration = Math.round((runEndTime - runStartTime) / 1000);

      if (emaCrosses.length > 0) {
        console.log(`🚨 Tìm thấy ${emaCrosses.length} EMA crosses!`);
        
        // Gửi thông báo qua Telegram
        await this.telegramService.sendBatchEMACrossAlerts(emaCrosses);
      } else {
        console.log('✅ Không có EMA cross nào được phát hiện');
      }

      console.log(`✅ Hoàn thành kiểm tra trong ${runDuration}s`);
      console.log(`⏰ Lần chạy tiếp theo: ${this.nextRunTime.toLocaleString('vi-VN')}`);

      // Gửi thông báo định kỳ về trạng thái (mỗi 10 lần chạy)
      if (this.runCount % 10 === 0) {
        await this.sendPeriodicStatusUpdate(runDuration, emaCrosses.length);
      }

    } catch (error) {
      console.error('❌ Lỗi trong quá trình kiểm tra EMA:', error);
      
      // Gửi thông báo lỗi
      await this.telegramService.sendErrorAlert(
        `❌ **Lỗi kiểm tra EMA**\n\n` +
        `🔄 Lần chạy: \`${this.runCount}\`\n` +
        `⏰ Thời gian: \`${runStartTime.toLocaleString('vi-VN')}\`\n` +
        `💥 Lỗi: \`${error.message}\``
      );
    }
  }

  // Gửi thông báo trạng thái định kỳ
  async sendPeriodicStatusUpdate(runDuration, crossCount) {
    const uptime = this.getUptime();
    const cacheInfo = this.emaMonitor.getCacheInfo();

    await this.telegramService.sendSystemAlert(
      `📊 **Báo cáo định kỳ EMA Monitor**\n\n` +
      `🔄 Lần chạy: \`${this.runCount}\`\n` +
      `⏰ Thời gian hoạt động: \`${uptime}\`\n` +
      `📉 EMA crosses phát hiện: \`${crossCount}\`\n` +
      `⏱️ Thời gian chạy: \`${runDuration}s\`\n` +
      `💾 Cache: \`${cacheInfo.totalCached}\` coins\n` +
      `📅 Cập nhật: \`${new Date().toLocaleString('vi-VN')}\``
    );
  }

  // Lấy thời gian hoạt động
  getUptime() {
    if (!this.startTime) return '0s';
    
    const now = new Date();
    const diffMs = now - this.startTime;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h ${diffMinutes % 60}m`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    } else {
      return `${diffSeconds}s`;
    }
  }

  // Lấy thông tin trạng thái
  getStatus() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      runCount: this.runCount,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.nextRunTime,
      uptime: this.getUptime(),
      cacheInfo: this.emaMonitor.getCacheInfo(),
      config: {
        intervalMinutes: emaConfig.SCHEDULER_INTERVAL_MINUTES,
        coinRank: `${emaConfig.COIN_RANK.MIN_RANK}-${emaConfig.COIN_RANK.MAX_RANK}`,
        emaPeriod: emaConfig.EMA.PERIOD,
        timeFrame: emaConfig.EMA.TIME_FRAME,
        cacheDurationHours: emaConfig.CACHE_DURATION_HOURS
      }
    };
  }

  // Test kết nối
  async testConnections() {
    console.log('🔍 Đang test kết nối EMA Monitor...');
    
    // Test Telegram
    const telegramTest = await this.telegramService.testConnection();
    console.log(`📱 Telegram: ${telegramTest.success ? '✅' : '❌'} ${telegramTest.message}`);
    
    // Test Binance API
    try {
      const testCoins = await this.emaMonitor.getTopCoinsByMarketCap();
      console.log(`📊 Binance API: ✅ Kết nối thành công (${testCoins.length} coins)`);
    } catch (error) {
      console.log(`📊 Binance API: ❌ Lỗi kết nối - ${error.message}`);
    }
  }

  // Restart scheduler
  restart() {
    console.log('🔄 Đang restart EMA Monitor scheduler...');
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }

  // Format số để hiển thị
  formatNumber(num) {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    } else {
      return num.toFixed(2);
    }
  }
}

module.exports = EMAMonitorScheduler;
