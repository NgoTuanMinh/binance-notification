require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const volumeConfig = require('./features/volumeMonitor/volumeMonitorConfig');

class TelegramService {
  constructor() {
    this.apiToken = volumeConfig.TELEGRAM.API_TOKEN;
    this.chatId = volumeConfig.TELEGRAM.CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.apiToken}`;
    this.enabled = volumeConfig.TELEGRAM.ENABLED;
  }

  // Kiểm tra cấu hình Telegram
  isConfigured() {
    return this.enabled && this.apiToken && this.chatId;
  }

  // Gửi message đến Telegram
  async sendMessage(message, parseMode = 'Markdown') {
    if (!this.isConfigured()) {
      console.warn('⚠️ Telegram không được cấu hình đúng cách. Bỏ qua gửi thông báo.');
      return false;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true
      });

      if (response.data.ok) {
        console.log('✅ Đã gửi thông báo Telegram thành công');
        return true;
      } else {
        console.error('❌ Lỗi gửi Telegram:', response.data.description);
        return false;
      }
    } catch (error) {
      console.error('❌ Lỗi gửi Telegram:', error.message);
      return false;
    }
  }

  // Gửi thông báo volume spike
  async sendVolumeSpikeAlert(spikeData) {
    const message = this.createVolumeSpikeMessage(spikeData);
    return await this.sendMessage(message);
  }

  // Gửi thông báo hệ thống
  async sendSystemAlert(message) {
    const systemMessage = `🔧 **SYSTEM ALERT** 🔧\n\n${message}`;
    return await this.sendMessage(systemMessage);
  }

  // Gửi thông báo lỗi
  async sendErrorAlert(errorMessage) {
    const errorMsg = `❌ **ERROR ALERT** ❌\n\n${errorMessage}`;
    return await this.sendMessage(errorMsg);
  }

  // Tạo message cho volume spike
  createVolumeSpikeMessage(spikeData) {
    const timestamp = new Date(spikeData.timestamp).toLocaleString('vi-VN');
    
    return `🚨 **VOLUME SPIKE DETECTED** 🚨

📈 **Coin:** \`${spikeData.symbol}\`
💰 **Giá hiện tại:** \`${this.formatPrice(spikeData.currentPrice)}\`
📊 **Khối lượng hiện tại:** \`${this.formatNumber(spikeData.currentVolume)}\`
📈 **Khối lượng trung bình:** \`${this.formatNumber(spikeData.averageVolume)}\`
🔥 **Tăng:** \`${spikeData.spikePercentage}%\` (\`${spikeData.volumeMultiplier.toFixed(2)}x\`)
⏰ **Thời gian:** \`${timestamp}\`

⚙️ **Cấu hình:**
• Rank: \`${volumeConfig.COIN_RANK.MIN_RANK}-${volumeConfig.COIN_RANK.MAX_RANK}\`
• Market cap: \`${volumeConfig.MARKET_CAP.ENABLED ? '≤ ' + this.formatNumber(volumeConfig.MARKET_CAP.MAX_MARKET_CAP) : 'Không giới hạn'}\`
• Khung thời gian: \`${volumeConfig.TIME_FRAME}\`
• Ngưỡng: \`${volumeConfig.VOLUME_SPIKE_MULTIPLIER}x\`
• Nến tính trung bình: \`${volumeConfig.CANDLE_COUNT_FOR_AVERAGE}\`

🔗 **Binance:** https://www.binance.com/en/trade/${spikeData.symbol}`;
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

  // Format giá
  formatPrice(price) {
    if (price >= 1) {
      return '$' + price.toFixed(2);
    } else if (price >= 0.01) {
      return '$' + price.toFixed(4);
    } else {
      return '$' + price.toFixed(6);
    }
  }

  // Test kết nối Telegram
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Telegram chưa được cấu hình đúng cách'
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      
      if (response.data.ok) {
        const botInfo = response.data.result;
        return {
          success: true,
          message: `Kết nối thành công với bot: @${botInfo.username}`
        };
      } else {
        return {
          success: false,
          message: 'Không thể kết nối với Telegram API'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Lỗi kết nối: ${error.message}`
      };
    }
  }

  // Gửi thông báo batch (nhiều volume spikes cùng lúc)
  async sendBatchVolumeSpikeAlerts(spikeDataArray) {
    if (!spikeDataArray || spikeDataArray.length === 0) {
      return true;
    }

    if (spikeDataArray.length === 1) {
      return await this.sendVolumeSpikeAlert(spikeDataArray[0]);
    }

    // Nếu có nhiều spikes, gửi summary
    const summaryMessage = this.createBatchSummaryMessage(spikeDataArray);
    return await this.sendMessage(summaryMessage);
  }

  // Gửi thông báo EMA cross
  async sendEMACrossAlert(crossData) {
    const message = this.createEMACrossMessage(crossData);
    return await this.sendMessage(message);
  }

  // Gửi thông báo batch EMA crosses
  async sendBatchEMACrossAlerts(crossDataArray) {
    if (!crossDataArray || crossDataArray.length === 0) {
      return true;
    }

    if (crossDataArray.length === 1) {
      return await this.sendEMACrossAlert(crossDataArray[0]);
    }

    // Nếu có nhiều crosses, gửi summary
    const summaryMessage = this.createBatchEMASummaryMessage(crossDataArray);
    return await this.sendMessage(summaryMessage);
  }

  // Tạo message summary cho batch
  createBatchSummaryMessage(spikeDataArray) {
    const timestamp = new Date().toLocaleString('vi-VN');
    
    let message = `🚨 **MULTIPLE VOLUME SPIKES DETECTED** 🚨\n\n`;
    message += `📊 **Tổng số:** \`${spikeDataArray.length}\` coins\n`;
    message += `⏰ **Thời gian:** \`${timestamp}\`\n\n`;

    spikeDataArray.forEach((spike, index) => {
      message += `**${index + 1}. ${spike.symbol}**\n`;
      message += `• Giá: \`${this.formatPrice(spike.currentPrice)}\`\n`;
      message += `• Tăng: \`${spike.spikePercentage}%\` (\`${spike.volumeMultiplier.toFixed(2)}x\`)\n`;
      message += `• Khối lượng: \`${this.formatNumber(spike.currentVolume)}\`\n\n`;
      // message += `• Khối lượng trung bình: \`${this.formatNumber(spike.averageVolume)}\`\n\n`;
    });

    message += `⚙️ **Cấu hình:**\n`;
    message += `• Rank: \`${volumeConfig.COIN_RANK.MIN_RANK}-${volumeConfig.COIN_RANK.MAX_RANK}\`\n`;
    message += `• Market cap: \`${volumeConfig.MARKET_CAP.ENABLED ? '≤ ' + this.formatNumber(volumeConfig.MARKET_CAP.MAX_MARKET_CAP) : 'Không giới hạn'}\`\n`;
    message += `• Khung: \`${volumeConfig.TIME_FRAME}\` | Ngưỡng: \`${volumeConfig.VOLUME_SPIKE_MULTIPLIER}x\``;

    return message;
  }

  // Tạo message cho EMA cross
  createEMACrossMessage(crossData) {
    const timestamp = new Date(crossData.timestamp).toLocaleString('vi-VN');
    
    return `📉 **EMA 200 CROSS DETECTED** 📉

📈 **Coin:** \`${crossData.symbol}\`
💰 **Giá hiện tại:** \`${this.formatPrice(crossData.currentPrice)}\`
📊 **EMA 200:** \`${this.formatPrice(crossData.ema200)}\`
📉 **Giá trước đó:** \`${this.formatPrice(crossData.previousPrice)}\`
📊 **Khoảng cách:** \`${crossData.priceBelowEMAPercent}%\` dưới EMA
⏰ **Thời gian:** \`${timestamp}\`

⚙️ **Cấu hình:**
• Rank: \`1-50\`
• Khung thời gian: \`4h\`
• EMA Period: \`200\`
• Cache: \`6h\`

🔗 **Binance:** https://www.binance.com/en/trade/${crossData.symbol}`;
  }

  // Tạo message summary cho batch EMA crosses
  createBatchEMASummaryMessage(crossDataArray) {
    const timestamp = new Date().toLocaleString('vi-VN');
    
    let message = `📉 **MULTIPLE EMA 200 CROSSES DETECTED** 📉\n\n`;
    message += `📊 **Tổng số:** \`${crossDataArray.length}\` coins\n`;
    message += `⏰ **Thời gian:** \`${timestamp}\`\n\n`;

    crossDataArray.forEach((cross, index) => {
      message += `**${index + 1}. ${cross.symbol}**\n`;
      message += `• Giá: \`${this.formatPrice(cross.currentPrice)}\`\n`;
      message += `• EMA 200: \`${this.formatPrice(cross.ema200)}\`\n`;
      message += `• Khoảng cách: \`${cross.priceBelowEMAPercent}%\` dưới EMA\n\n`;
    });

    message += `⚙️ **Cấu hình:**\n`;
    message += `• Rank: \`1-50\`\n`;
    message += `• Khung: \`4h\` | EMA: \`200\``;

    return message;
  }
}

module.exports = TelegramService;
