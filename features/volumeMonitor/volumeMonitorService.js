require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const volumeConfig = require('./volumeMonitorConfig');
const config = require('../../config');

class VolumeMonitorService {
  constructor() {
    this.cache = new Map(); // Cache để lưu thông tin coin đã báo
    this.binanceAPI = config.BINANCE_API_BASE_URL;
  }

  // Lấy danh sách top coins theo market cap
  async getTopCoinsByMarketCap() {
    try {
      const response = await axios.get(`${this.binanceAPI}/api/v3/ticker/24hr`);
      const coins = response.data
        .filter(coin => coin.symbol.endsWith('USDT'))
        .map(coin => ({
          symbol: coin.symbol,
          marketCap: parseFloat(coin.quoteVolume), // Sử dụng quoteVolume làm proxy cho market cap
          volume24h: parseFloat(coin.volume),
          price: parseFloat(coin.lastPrice)
        }))
        .sort((a, b) => b.marketCap - a.marketCap);

      // Lấy coins trong rank từ MIN_RANK đến MAX_RANK
      const startIndex = volumeConfig.COIN_RANK.MIN_RANK - 1;
      const endIndex = volumeConfig.COIN_RANK.MAX_RANK;
      
      let filteredCoins = coins.slice(startIndex, endIndex);

      // Áp dụng filter market cap nếu được bật
      if (volumeConfig.MARKET_CAP.ENABLED) {
        filteredCoins = filteredCoins.filter(coin => 
          coin.marketCap <= volumeConfig.MARKET_CAP.MAX_MARKET_CAP
        );
        
        console.log(`📊 Filtered by market cap <= ${this.formatNumber(volumeConfig.MARKET_CAP.MAX_MARKET_CAP)}: ${filteredCoins.length} coins`);
      }
      
      return filteredCoins;
    } catch (error) {
      console.error('Error fetching top coins:', error);
      throw error;
    }
  }

  // Lấy dữ liệu nến theo khung thời gian
  async getKlineData(symbol, interval = volumeConfig.TIME_FRAME, limit = volumeConfig.CANDLE_COUNT_FOR_AVERAGE) {
    try {
      const response = await axios.get(`${this.binanceAPI}/api/v3/klines`, {
        params: {
          symbol: symbol,
          interval: interval,
          limit: limit
        }
      });

      return response.data.map(kline => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        closeTime: kline[6],
        quoteVolume: parseFloat(kline[7]),
        trades: kline[8],
        takerBuyBaseVolume: parseFloat(kline[9]),
        takerBuyQuoteVolume: parseFloat(kline[10])
      }));
    } catch (error) {
      console.error(`Error fetching kline data for ${symbol}:`, error);
      throw error;
    }
  }

  // Tính trung bình khối lượng của các nến
  calculateAverageVolume(klineData) {
    if (klineData.length === 0) return 0;
    
    const totalVolume = klineData.reduce((sum, kline) => sum + kline.volume, 0);
    return totalVolume / klineData.length;
  }

  // Kiểm tra xem coin có tăng đột biến không
  async checkVolumeSpike(symbol) {
    try {
      // Lấy dữ liệu nến
      const klineData = await this.getKlineData(symbol);
      
      if (klineData.length < 2) {
        return null; // Không đủ dữ liệu
      }

      // Nến hiện tại (nến cuối cùng)
      const currentCandle = klineData[klineData.length - 1];
      
      // Tính trung bình khối lượng của các nến trước đó
      const previousCandles = klineData.slice(0, -1);
      const averageVolume = this.calculateAverageVolume(previousCandles);
      
      // Kiểm tra điều kiện tăng đột biến
      const volumeMultiplier = currentCandle.volume / averageVolume;
      
      if (volumeMultiplier >= volumeConfig.VOLUME_SPIKE_MULTIPLIER) {
        return {
          symbol: symbol,
          currentVolume: currentCandle.volume,
          averageVolume: averageVolume,
          volumeMultiplier: volumeMultiplier,
          currentPrice: currentCandle.close,
          timestamp: currentCandle.timestamp,
          spikePercentage: ((volumeMultiplier - 1) * 100).toFixed(2)
        };
      }

      return null;
    } catch (error) {
      console.error(`Error checking volume spike for ${symbol}:`, error);
      return null;
    }
  }

  // Kiểm tra cache để tránh báo trùng
  isCoinCached(symbol) {
    const cacheKey = symbol;
    const cachedData = this.cache.get(cacheKey);
    
    if (!cachedData) {
      return false;
    }

    const now = Date.now();
    const cacheExpiry = cachedData.timestamp + (volumeConfig.CACHE_DURATION_HOURS * 60 * 60 * 1000);
    
    if (now > cacheExpiry) {
      // Cache đã hết hạn, xóa khỏi cache
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  // Thêm coin vào cache
  addToCache(symbol, spikeData) {
    const cacheKey = symbol;
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      spikeData: spikeData
    });
  }

  // Kiểm tra tất cả coins và tìm volume spike
  async checkAllCoinsForVolumeSpikes() {
    try {
      console.log('🔍 Bắt đầu kiểm tra volume spikes...');
      
      // Lấy danh sách top coins
      const topCoins = await this.getTopCoinsByMarketCap();
      let logMessage = `📊 Đang kiểm tra ${topCoins.length} coins (rank ${volumeConfig.COIN_RANK.MIN_RANK}-${volumeConfig.COIN_RANK.MAX_RANK})`;
      
      if (volumeConfig.MARKET_CAP.ENABLED) {
        logMessage += ` với market cap <= ${this.formatNumber(volumeConfig.MARKET_CAP.MAX_MARKET_CAP)}`;
      }
      
      console.log(logMessage);

      const volumeSpikes = [];

      // Kiểm tra từng coin
      for (const coin of topCoins) {
        // Bỏ qua nếu coin đã được cache
        if (this.isCoinCached(coin.symbol)) {
          continue;
        }

        const spikeData = await this.checkVolumeSpike(coin.symbol);
        
        if (spikeData) {
          console.log(`🚨 Volume spike detected: ${coin.symbol} - ${spikeData.spikePercentage}% increase`);
          
          // Thêm vào cache để tránh báo trùng
          this.addToCache(coin.symbol, spikeData);
          
          volumeSpikes.push(spikeData);
        }

        // Thêm delay nhỏ để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Hoàn thành kiểm tra. Tìm thấy ${volumeSpikes.length} volume spikes`);
      return volumeSpikes;

    } catch (error) {
      console.error('Error in checkAllCoinsForVolumeSpikes:', error);
      throw error;
    }
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

  // Tạo message cho Telegram
  createTelegramMessage(spikeData) {
    const timestamp = new Date(spikeData.timestamp).toLocaleString('vi-VN');
    
    return `🚨 **VOLUME SPIKE DETECTED** 🚨

📈 **Coin:** ${spikeData.symbol}
💰 **Giá hiện tại:** ${this.formatPrice(spikeData.currentPrice)}
📊 **Khối lượng hiện tại:** ${this.formatNumber(spikeData.currentVolume)}
📈 **Khối lượng trung bình:** ${this.formatNumber(spikeData.averageVolume)}
🔥 **Tăng:** ${spikeData.spikePercentage}% (${spikeData.volumeMultiplier.toFixed(2)}x)
⏰ **Thời gian:** ${timestamp}

⚙️ **Cấu hình:**
• Rank: ${volumeConfig.COIN_RANK.MIN_RANK}-${volumeConfig.COIN_RANK.MAX_RANK}
• Khung thời gian: ${volumeConfig.TIME_FRAME}
• Ngưỡng: ${volumeConfig.VOLUME_SPIKE_MULTIPLIER}x
• Nến tính trung bình: ${volumeConfig.CANDLE_COUNT_FOR_AVERAGE}`;
  }

  // Lấy thông tin cache
  getCacheInfo() {
    const cacheEntries = Array.from(this.cache.entries()).map(([symbol, data]) => ({
      symbol,
      timestamp: new Date(data.timestamp).toLocaleString('vi-VN'),
      expiresAt: new Date(data.timestamp + (volumeConfig.CACHE_DURATION_HOURS * 60 * 60 * 1000)).toLocaleString('vi-VN')
    }));

    return {
      totalCached: this.cache.size,
      cacheDurationHours: volumeConfig.CACHE_DURATION_HOURS,
      entries: cacheEntries
    };
  }

  // Xóa cache
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache đã được xóa');
  }
}

module.exports = VolumeMonitorService;
