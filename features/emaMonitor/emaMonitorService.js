require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const emaConfig = require('./emaMonitorConfig');
const config = require('../../config');

class EMAMonitorService {
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
      const startIndex = emaConfig.COIN_RANK.MIN_RANK - 1;
      const endIndex = emaConfig.COIN_RANK.MAX_RANK;
      
      let filteredCoins = coins.slice(startIndex, endIndex);

      // Áp dụng filter market cap nếu được bật
      if (emaConfig.MARKET_CAP.ENABLED) {
        filteredCoins = filteredCoins.filter(coin => 
          coin.marketCap <= emaConfig.MARKET_CAP.MAX_MARKET_CAP
        );
        
        console.log(`📊 Filtered by market cap <= ${this.formatNumber(emaConfig.MARKET_CAP.MAX_MARKET_CAP)}: ${filteredCoins.length} coins`);
      }
      
      return filteredCoins;
    } catch (error) {
      console.error('Error fetching top coins:', error);
      throw error;
    }
  }

  // Lấy dữ liệu nến theo khung thời gian
  async getKlineData(symbol, interval = emaConfig.EMA.TIME_FRAME, limit = emaConfig.EMA.CANDLE_COUNT_FOR_EMA) {
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

  // Tính EMA (Exponential Moving Average)
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null; // Không đủ dữ liệu
    }

    const multiplier = 2 / (period + 1);
    let ema = prices[0]; // Bắt đầu với giá đầu tiên

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // Kiểm tra xem giá có cắt xuống EMA 200 không
  async checkEMACross(symbol) {
    try {
      // Lấy dữ liệu nến
      const klineData = await this.getKlineData(symbol);
      
      if (klineData.length < emaConfig.EMA.PERIOD + 1) {
        return null; // Không đủ dữ liệu
      }

      // Lấy giá đóng cửa của các nến
      const closingPrices = klineData.map(kline => kline.close);
      
      // Tính EMA 200
      const ema200 = this.calculateEMA(closingPrices, emaConfig.EMA.PERIOD);
      
      if (!ema200) {
        return null;
      }

      // Nến hiện tại và nến trước đó
      const currentCandle = klineData[klineData.length - 1];
      const previousCandle = klineData[klineData.length - 2];
      
      const currentPrice = currentCandle.close;
      const previousPrice = previousCandle.close;
      
      // Kiểm tra điều kiện: giá hiện tại < EMA 200 và giá trước đó >= EMA 200
      const isCurrentBelowEMA = currentPrice < ema200;
      const wasPreviousAboveEMA = previousPrice >= ema200;
      
      if (isCurrentBelowEMA && wasPreviousAboveEMA) {
        return {
          symbol: symbol,
          currentPrice: currentPrice,
          previousPrice: previousPrice,
          ema200: ema200,
          timestamp: currentCandle.timestamp,
          priceBelowEMAPercent: ((ema200 - currentPrice) / ema200 * 100).toFixed(2),
          crossType: 'BEARISH' // Giá cắt xuống EMA
        };
      }

      return null;
    } catch (error) {
      console.error(`Error checking EMA cross for ${symbol}:`, error);
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
    const cacheExpiry = cachedData.timestamp + (emaConfig.CACHE_DURATION_HOURS * 60 * 60 * 1000);
    
    if (now > cacheExpiry) {
      // Cache đã hết hạn, xóa khỏi cache
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  // Thêm coin vào cache
  addToCache(symbol, crossData) {
    const cacheKey = symbol;
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      crossData: crossData
    });
  }

  // Kiểm tra tất cả coins và tìm EMA cross
  async checkAllCoinsForEMACross() {
    try {
      console.log('🔍 Bắt đầu kiểm tra EMA 200 cross...');
      
      // Lấy danh sách top coins
      const topCoins = await this.getTopCoinsByMarketCap();
      let logMessage = `📊 Đang kiểm tra ${topCoins.length} coins (rank ${emaConfig.COIN_RANK.MIN_RANK}-${emaConfig.COIN_RANK.MAX_RANK})`;
      
      if (emaConfig.MARKET_CAP.ENABLED) {
        logMessage += ` với market cap <= ${this.formatNumber(emaConfig.MARKET_CAP.MAX_MARKET_CAP)}`;
      }
      
      console.log(logMessage);

      const emaCrosses = [];

      // Kiểm tra từng coin
      for (const coin of topCoins) {
        // Bỏ qua nếu coin đã được cache
        if (this.isCoinCached(coin.symbol)) {
          continue;
        }

        const crossData = await this.checkEMACross(coin.symbol);
        
        if (crossData) {
          console.log(`🚨 EMA 200 cross detected: ${coin.symbol} - Price: $${crossData.currentPrice.toFixed(4)}, EMA: $${crossData.ema200.toFixed(4)}`);
          
          // Thêm vào cache để tránh báo trùng
          this.addToCache(coin.symbol, crossData);
          
          emaCrosses.push(crossData);
        }

        // Thêm delay nhỏ để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Hoàn thành kiểm tra. Tìm thấy ${emaCrosses.length} EMA crosses`);
      return emaCrosses;

    } catch (error) {
      console.error('Error in checkAllCoinsForEMACross:', error);
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
  createTelegramMessage(crossData) {
    const timestamp = new Date(crossData.timestamp).toLocaleString('vi-VN');
    
    return `📉 **EMA 200 CROSS DETECTED** 📉

📈 **Coin:** ${crossData.symbol}
💰 **Giá hiện tại:** ${this.formatPrice(crossData.currentPrice)}
📊 **EMA 200:** ${this.formatPrice(crossData.ema200)}
📉 **Giá trước đó:** ${this.formatPrice(crossData.previousPrice)}
📊 **Khoảng cách:** ${crossData.priceBelowEMAPercent}% dưới EMA
⏰ **Thời gian:** ${timestamp}

⚙️ **Cấu hình:**
• Rank: ${emaConfig.COIN_RANK.MIN_RANK}-${emaConfig.COIN_RANK.MAX_RANK}
• Khung thời gian: ${emaConfig.EMA.TIME_FRAME}
• EMA Period: ${emaConfig.EMA.PERIOD}
• Cache: ${emaConfig.CACHE_DURATION_HOURS}h`;
  }

  // Lấy thông tin cache
  getCacheInfo() {
    const cacheEntries = Array.from(this.cache.entries()).map(([symbol, data]) => ({
      symbol,
      timestamp: new Date(data.timestamp).toLocaleString('vi-VN'),
      expiresAt: new Date(data.timestamp + (emaConfig.CACHE_DURATION_HOURS * 60 * 60 * 1000)).toLocaleString('vi-VN')
    }));

    return {
      totalCached: this.cache.size,
      cacheDurationHours: emaConfig.CACHE_DURATION_HOURS,
      entries: cacheEntries
    };
  }

  // Xóa cache
  clearCache() {
    this.cache.clear();
    console.log('🗑️ EMA Monitor cache đã được xóa');
  }
}

module.exports = EMAMonitorService;
