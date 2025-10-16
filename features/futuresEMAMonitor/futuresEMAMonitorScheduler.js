require('dotenv').config({ path: '.env.local' });
const FuturesEMAMonitorService = require('./futuresEMAMonitorService');
const TelegramService = require('../../telegramService');
const futuresEMAConfig = require('./futuresEMAMonitorConfig');

class FuturesEMAMonitorScheduler {
  constructor() {
    this.futuresEMAMonitor = new FuturesEMAMonitorService();
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
      console.log('⚠️ Futures EMA Monitor Scheduler đã đang chạy');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.runCount = 0;

    console.log('🚀 Bắt đầu Futures EMA Monitor Scheduler');
    console.log(`⏰ Chạy mỗi ${futuresEMAConfig.SCHEDULER_INTERVAL_MINUTES} phút`);
    let configMessage = `📊 Cấu hình: Rank ${futuresEMAConfig.COIN_RANK.MIN_RANK}-${futuresEMAConfig.COIN_RANK.MAX_RANK}, EMA ${futuresEMAConfig.EMA.PERIOD}, Khung ${futuresEMAConfig.EMA.TIME_FRAME}`;
    
    if (futuresEMAConfig.MARKET_CAP.ENABLED) {
      configMessage += `, Market cap ≤ ${this.formatNumber(futuresEMAConfig.MARKET_CAP.MAX_MARKET_CAP)}`;
    }
    
    console.log(configMessage);

    // Chạy ngay lần đầu
    this.runFuturesTradingCheck();

    // Thiết lập interval
    this.intervalId = setInterval(() => {
      this.runFuturesTradingCheck();
    }, futuresEMAConfig.SCHEDULER_INTERVAL_MINUTES * 60 * 1000);

    // Gửi thông báo khởi động
    this.telegramService.sendSystemAlert(
      `🚀 **Futures EMA Monitor đã khởi động**\n\n` +
      `⏰ Chạy mỗi: \`${futuresEMAConfig.SCHEDULER_INTERVAL_MINUTES}\` phút\n` +
      `📊 Rank: \`${futuresEMAConfig.COIN_RANK.MIN_RANK}-${futuresEMAConfig.COIN_RANK.MAX_RANK}\`\n` +
      `📈 EMA: \`${futuresEMAConfig.EMA.PERIOD}\`\n` +
      `⏱️ Khung: \`${futuresEMAConfig.EMA.TIME_FRAME}\`\n` +
      `🎯 Tín hiệu: \`LONG/SHORT\`\n` +
      `📅 Thời gian: \`${this.startTime.toLocaleString('vi-VN')}\``
    );
  }

  // Dừng scheduler
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Futures EMA Monitor Scheduler chưa chạy');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const uptime = this.getUptime();
    console.log('🛑 Đã dừng Futures EMA Monitor Scheduler');
    console.log(`📊 Tổng số lần chạy: ${this.runCount}`);
    console.log(`⏰ Thời gian hoạt động: ${uptime}`);

    // Gửi thông báo dừng
    this.telegramService.sendSystemAlert(
      `🛑 **Futures EMA Monitor đã dừng**\n\n` +
      `📊 Tổng số lần chạy: \`${this.runCount}\`\n` +
      `⏰ Thời gian hoạt động: \`${uptime}\`\n` +
      `📅 Dừng lúc: \`${new Date().toLocaleString('vi-VN')}\``
    );
  }

  // Chạy kiểm tra tín hiệu trading futures
  async runFuturesTradingCheck() {
    const runStartTime = new Date();
    this.runCount++;
    this.lastRunTime = runStartTime;
    this.nextRunTime = new Date(runStartTime.getTime() + (futuresEMAConfig.SCHEDULER_INTERVAL_MINUTES * 60 * 1000));

    console.log(`\n🔄 [Lần ${this.runCount}] Bắt đầu kiểm tra tín hiệu trading futures...`);
    console.log(`⏰ Thời gian: ${runStartTime.toLocaleString('vi-VN')}`);

    try {
      // Kiểm tra tín hiệu trading
      const tradingSignals = await this.futuresEMAMonitor.checkAllCoinsForTradingSignals();

      const runEndTime = new Date();
      const runDuration = Math.round((runEndTime - runStartTime) / 1000);

      if (tradingSignals.length > 0) {
        console.log(`🚨 Tìm thấy ${tradingSignals.length} tín hiệu trading!`);
        
        // Gửi thông báo qua Telegram
        await this.telegramService.sendBatchFuturesTradingAlerts(tradingSignals);
      } else {
        console.log('✅ Không có tín hiệu trading nào được phát hiện');
      }

      console.log(`✅ Hoàn thành kiểm tra trong ${runDuration}s`);
      console.log(`⏰ Lần chạy tiếp theo: ${this.nextRunTime.toLocaleString('vi-VN')}`);

      // Gửi thông báo định kỳ về trạng thái (mỗi 20 lần chạy)
      if (this.runCount % 20 === 0) {
        await this.sendPeriodicStatusUpdate(runDuration, tradingSignals.length);
      }

    } catch (error) {
      console.error('❌ Lỗi trong quá trình kiểm tra tín hiệu trading:', error);
      
      // Gửi thông báo lỗi
      await this.telegramService.sendErrorAlert(
        `❌ **Lỗi kiểm tra tín hiệu trading**\n\n` +
        `🔄 Lần chạy: \`${this.runCount}\`\n` +
        `⏰ Thời gian: \`${runStartTime.toLocaleString('vi-VN')}\`\n` +
        `💥 Lỗi: \`${error.message}\``
      );
    }
  }

  // Gửi thông báo trạng thái định kỳ
  async sendPeriodicStatusUpdate(runDuration, signalCount) {
    const uptime = this.getUptime();
    const cacheInfo = this.futuresEMAMonitor.getCacheInfo();

    await this.telegramService.sendSystemAlert(
      `📊 **Báo cáo định kỳ Futures EMA Monitor**\n\n` +
      `🔄 Lần chạy: \`${this.runCount}\`\n` +
      `⏰ Thời gian hoạt động: \`${uptime}\`\n` +
      `🎯 Tín hiệu phát hiện: \`${signalCount}\`\n` +
      `⏱️ Thời gian chạy: \`${runDuration}s\`\n` +
      `💾 Cache: \`${cacheInfo.totalCached}\` signals\n` +
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
      cacheInfo: this.futuresEMAMonitor.getCacheInfo(),
      config: {
        intervalMinutes: futuresEMAConfig.SCHEDULER_INTERVAL_MINUTES,
        coinRank: `${futuresEMAConfig.COIN_RANK.MIN_RANK}-${futuresEMAConfig.COIN_RANK.MAX_RANK}`,
        emaPeriod: futuresEMAConfig.EMA.PERIOD,
        timeFrame: futuresEMAConfig.EMA.TIME_FRAME,
        cacheDurationHours: futuresEMAConfig.CACHE_DURATION_HOURS
      }
    };
  }

  // Test kết nối
  async testConnections() {
    console.log('🔍 Đang test kết nối Futures EMA Monitor...');
    
    // Test Telegram
    const telegramTest = await this.telegramService.testConnection();
    console.log(`📱 Telegram: ${telegramTest.success ? '✅' : '❌'} ${telegramTest.message}`);
    
    // Test Binance API
    try {
      const testCoins = await this.futuresEMAMonitor.getTopCoinsByMarketCap();
      console.log(`📊 Binance API: ✅ Kết nối thành công (${testCoins.length} coins)`);
    } catch (error) {
      console.log(`📊 Binance API: ❌ Lỗi kết nối - ${error.message}`);
    }
  }

  // Restart scheduler
  restart() {
    console.log('🔄 Đang restart Futures EMA Monitor scheduler...');
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

module.exports = FuturesEMAMonitorScheduler;
