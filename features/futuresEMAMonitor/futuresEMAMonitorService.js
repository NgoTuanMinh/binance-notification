require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const futuresEMAConfig = require('./futuresEMAMonitorConfig');
const config = require('../../config');

class FuturesEMAMonitorService {
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
      const startIndex = futuresEMAConfig.COIN_RANK.MIN_RANK - 1;
      const endIndex = futuresEMAConfig.COIN_RANK.MAX_RANK;
      
      let filteredCoins = coins.slice(startIndex, endIndex);

      // Áp dụng filter market cap nếu được bật
      if (futuresEMAConfig.MARKET_CAP.ENABLED) {
        filteredCoins = filteredCoins.filter(coin => 
          coin.marketCap <= futuresEMAConfig.MARKET_CAP.MAX_MARKET_CAP
        );
        
        console.log(`📊 Filtered by market cap <= ${this.formatNumber(futuresEMAConfig.MARKET_CAP.MAX_MARKET_CAP)}: ${filteredCoins.length} coins`);
      }
      
      return filteredCoins;
    } catch (error) {
      console.error('Error fetching top coins:', error);
      throw error;
    }
  }

  // Lấy dữ liệu nến theo khung thời gian
  async getKlineData(symbol, interval = futuresEMAConfig.EMA.TIME_FRAME, limit = futuresEMAConfig.EMA.CANDLE_COUNT_FOR_EMA) {
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

  // Kiểm tra tín hiệu trading futures (long/short)
  async checkFuturesTradingSignal(symbol) {
    try {
      // Lấy dữ liệu nến
      const klineData = await this.getKlineData(symbol);
      
      if (klineData.length < futuresEMAConfig.EMA.PERIOD + 1) {
        return null; // Không đủ dữ liệu
      }

      // Lấy giá đóng cửa của các nến
      const closingPrices = klineData.map(kline => kline.close);
      
      // Tính EMA 200
      const ema200 = this.calculateEMA(closingPrices, futuresEMAConfig.EMA.PERIOD);
      
      if (!ema200) {
        return null;
      }

      // Nến hiện tại và nến trước đó
      const currentCandle = klineData[klineData.length - 1];
      const previousCandle = klineData[klineData.length - 2];
      
      const currentPrice = currentCandle.close;
      const previousPrice = previousCandle.close;
      
      // Kiểm tra tín hiệu LONG: giá hiện tại > EMA 200 và giá trước đó <= EMA 200
      const isCurrentAboveEMA = currentPrice > ema200;
      const wasPreviousBelowEMA = previousPrice <= ema200;
      
      // Kiểm tra tín hiệu SHORT: giá hiện tại < EMA 200 và giá trước đó >= EMA 200
      const isCurrentBelowEMA = currentPrice < ema200;
      const wasPreviousAboveEMA = previousPrice >= ema200;
      
      if (isCurrentAboveEMA && wasPreviousBelowEMA) {
        // Tín hiệu LONG
        return {
          symbol: symbol,
          signal: 'LONG',
          currentPrice: currentPrice,
          previousPrice: previousPrice,
          ema200: ema200,
          timestamp: currentCandle.timestamp,
          priceAboveEMAPercent: ((currentPrice - ema200) / ema200 * 100).toFixed(2),
          crossType: 'BULLISH' // Giá cắt lên EMA
        };
      } else if (isCurrentBelowEMA && wasPreviousAboveEMA) {
        // Tín hiệu SHORT
        return {
          symbol: symbol,
          signal: 'SHORT',
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
      console.error(`Error checking futures trading signal for ${symbol}:`, error);
      return null;
    }
  }

  // Kiểm tra cache để tránh báo trùng
  isCoinCached(symbol, signal) {
    const cacheKey = `${symbol}_${signal}`;
    const cachedData = this.cache.get(cacheKey);
    
    if (!cachedData) {
      return false;
    }

    const now = Date.now();
    const cacheExpiry = cachedData.timestamp + (futuresEMAConfig.CACHE_DURATION_HOURS * 60 * 60 * 1000);
    
    if (now > cacheExpiry) {
      // Cache đã hết hạn, xóa khỏi cache
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  // Thêm coin vào cache
  addToCache(symbol, signal, signalData) {
    const cacheKey = `${symbol}_${signal}`;
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      signalData: signalData
    });
  }

  // Kiểm tra tất cả coins và tìm tín hiệu trading
  async checkAllCoinsForTradingSignals() {
    try {
      console.log('🔍 Bắt đầu kiểm tra tín hiệu trading futures...');
      
      // Lấy danh sách top coins
      const topCoins = await this.getTopCoinsByMarketCap();
      let logMessage = `📊 Đang kiểm tra ${topCoins.length} coins (rank ${futuresEMAConfig.COIN_RANK.MIN_RANK}-${futuresEMAConfig.COIN_RANK.MAX_RANK})`;
      
      if (futuresEMAConfig.MARKET_CAP.ENABLED) {
        logMessage += ` với market cap <= ${this.formatNumber(futuresEMAConfig.MARKET_CAP.MAX_MARKET_CAP)}`;
      }
      
      console.log(logMessage);

      const tradingSignals = [];

      // Kiểm tra từng coin
      for (const coin of topCoins) {
        const signalData = await this.checkFuturesTradingSignal(coin.symbol);
        
        if (signalData) {
          // Kiểm tra cache để tránh báo trùng
          if (this.isCoinCached(coin.symbol, signalData.signal)) {
            continue;
          }

          console.log(`🚨 Futures signal detected: ${coin.symbol} - ${signalData.signal} - Price: $${signalData.currentPrice.toFixed(4)}, EMA: $${signalData.ema200.toFixed(4)}`);
          
          // Thêm vào cache để tránh báo trùng
          this.addToCache(coin.symbol, signalData.signal, signalData);
          
          tradingSignals.push(signalData);
        }

        // Thêm delay nhỏ để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Hoàn thành kiểm tra. Tìm thấy ${tradingSignals.length} tín hiệu trading`);
      return tradingSignals;

    } catch (error) {
      console.error('Error in checkAllCoinsForTradingSignals:', error);
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
  createTelegramMessage(signalData) {
    const timestamp = new Date(signalData.timestamp).toLocaleString('vi-VN');
    const signalEmoji = signalData.signal === 'LONG' ? '🟢' : '🔴';
    const signalText = signalData.signal === 'LONG' ? 'LONG' : 'SHORT';
    
    return `${signalEmoji} **FUTURES SIGNAL - ${signalText}** ${signalEmoji}

📈 **Coin:** ${signalData.symbol}
💰 **Giá hiện tại:** ${this.formatPrice(signalData.currentPrice)}
📊 **EMA 200:** ${this.formatPrice(signalData.ema200)}
📉 **Giá trước đó:** ${this.formatPrice(signalData.previousPrice)}
${signalData.signal === 'LONG' ? 
  `📊 **Khoảng cách:** ${signalData.priceAboveEMAPercent}% trên EMA` :
  `📊 **Khoảng cách:** ${signalData.priceBelowEMAPercent}% dưới EMA`
}
⏰ **Thời gian:** ${timestamp}

⚙️ **Cấu hình:**
• Rank: ${futuresEMAConfig.COIN_RANK.MIN_RANK}-${futuresEMAConfig.COIN_RANK.MAX_RANK}
• Khung thời gian: ${futuresEMAConfig.EMA.TIME_FRAME}
• EMA Period: ${futuresEMAConfig.EMA.PERIOD}
• Cache: ${futuresEMAConfig.CACHE_DURATION_HOURS}h

🔗 **Binance Futures:** https://www.binance.com/en/futures/${signalData.symbol}`;
  }

  // Lấy thông tin cache
  getCacheInfo() {
    const cacheEntries = Array.from(this.cache.entries()).map(([key, data]) => ({
      key,
      timestamp: new Date(data.timestamp).toLocaleString('vi-VN'),
      expiresAt: new Date(data.timestamp + (futuresEMAConfig.CACHE_DURATION_HOURS * 60 * 60 * 1000)).toLocaleString('vi-VN')
    }));

    return {
      totalCached: this.cache.size,
      cacheDurationHours: futuresEMAConfig.CACHE_DURATION_HOURS,
      entries: cacheEntries
    };
  }

  // Xóa cache
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Futures EMA Monitor cache đã được xóa');
  }
}

module.exports = FuturesEMAMonitorService;
