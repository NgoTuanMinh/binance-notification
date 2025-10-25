require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const futuresEMAConfig = require('./futuresEMAMonitorConfig');
const config = require('../../config');

class FuturesEMAMonitorService {
  constructor() {
    this.cache = new Map(); // Cache để lưu thông tin coin đã báo
    this.binanceAPI = config.BINANCE_API_BASE_URL;
    
    // Cấu hình axios với timeout và retry
    this.axiosConfig = {
      timeout: futuresEMAConfig.CONNECTION.TIMEOUT_MS,
      headers: {
        'User-Agent': 'FuturesEMAMonitor/1.0',
        'Accept': 'application/json'
      }
    };
    
    // Cấu hình retry từ config
    this.retryConfig = {
      maxRetries: futuresEMAConfig.CONNECTION.MAX_RETRIES,
      retryDelay: futuresEMAConfig.CONNECTION.RETRY_DELAY_MS,
      retryDelayMultiplier: futuresEMAConfig.CONNECTION.RETRY_DELAY_MULTIPLIER
    };
  }

  // Method retry với exponential backoff
  async retryRequest(requestFn, context = '') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Kiểm tra loại lỗi có thể retry được
        const isRetryableError = this.isRetryableError(error);
        
        if (!isRetryableError || attempt === this.retryConfig.maxRetries) {
          throw error;
        }
        
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryDelayMultiplier, attempt - 1);
        console.warn(`⚠️ [${context}] Lần thử ${attempt}/${this.retryConfig.maxRetries} thất bại: ${error.message}. Retry sau ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Kiểm tra lỗi có thể retry được
  isRetryableError(error) {
    if (!error.code && !error.response) return false;
    
    // ECONNRESET, ETIMEDOUT, ENOTFOUND, etc.
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNABORTED'];
    if (retryableCodes.includes(error.code)) return true;
    
    // HTTP status codes có thể retry
    if (error.response) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(error.response.status);
    }
    
    return false;
  }

  // Lấy danh sách top coins theo market cap
  async getTopCoinsByMarketCap() {
    return await this.retryRequest(async () => {
      const response = await axios.get(`${this.binanceAPI}/api/v3/ticker/24hr`, this.axiosConfig);
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
    }, 'getTopCoinsByMarketCap');
  }

  // Lấy dữ liệu nến theo khung thời gian
  async getKlineData(symbol, interval = futuresEMAConfig.EMA.TIME_FRAME, limit = futuresEMAConfig.EMA.CANDLE_COUNT_FOR_EMA) {
    return await this.retryRequest(async () => {
      const response = await axios.get(`${this.binanceAPI}/api/v3/klines`, {
        ...this.axiosConfig,
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
    }, `getKlineData-${symbol}`);
  }

  // Tính EMA (Exponential Moving Average) - Chuẩn Binance/TradingView
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null; // Không đủ dữ liệu
    }

    // Cách tính EMA chuẩn:
    // 1. Tính SMA đầu tiên cho period đầu tiên
    // 2. Tính EMA từ SMA đó
    
    const multiplier = 2 / (period + 1);
    
    // Tính SMA đầu tiên
    let sma = 0;
    for (let i = 0; i < period; i++) {
      sma += prices[i];
    }
    sma = sma / period;
    
    // Tính EMA từ SMA đầu tiên
    let ema = sma;
    
    // Tính EMA cho các giá trị còn lại
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // Tính EMA với độ chính xác cao hơn (sử dụng nhiều decimal)
  calculateEMAPrecise(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    
    // Tính SMA đầu tiên với độ chính xác cao
    let sma = 0;
    for (let i = 0; i < period; i++) {
      sma += prices[i];
    }
    sma = sma / period;
    
    let ema = sma;
    
    // Tính EMA với độ chính xác cao
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // Tính EMA với nhiều cách khác nhau để so sánh
  calculateEMAMultiple(prices, period) {
    if (prices.length < period) {
      return null;
    }

    // Cách 1: Bắt đầu với giá đầu tiên (cách cũ)
    const multiplier = 2 / (period + 1);
    let ema1 = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema1 = (prices[i] * multiplier) + (ema1 * (1 - multiplier));
    }

    // Cách 2: Bắt đầu với SMA (cách mới)
    let sma = 0;
    for (let i = 0; i < period; i++) {
      sma += prices[i];
    }
    sma = sma / period;
    let ema2 = sma;
    for (let i = period; i < prices.length; i++) {
      ema2 = (prices[i] * multiplier) + (ema2 * (1 - multiplier));
    }

    // Cách 3: Sử dụng tất cả dữ liệu để tính SMA đầu tiên
    let ema3 = prices[0];
    for (let i = 1; i < prices.length; i++) {
      if (i < period) {
        // Trong period đầu, tính SMA
        let tempSma = 0;
        for (let j = 0; j <= i; j++) {
          tempSma += prices[j];
        }
        ema3 = tempSma / (i + 1);
      } else {
        // Sau period đầu, tính EMA
        ema3 = (prices[i] * multiplier) + (ema3 * (1 - multiplier));
      }
    }

    return {
      method1: ema1,
      method2: ema2,
      method3: ema3,
      recommended: ema2 // Sử dụng cách 2 (SMA đầu tiên)
    };
  }

  // Lấy EMA200 trực tiếp từ Binance API để so sánh
  async getBinanceEMA200(symbol, interval = futuresEMAConfig.EMA.TIME_FRAME) {
    return await this.retryRequest(async () => {
      const response = await axios.get(`${this.binanceAPI}/api/v3/klines`, {
        ...this.axiosConfig,
        params: {
          symbol: symbol,
          interval: interval,
          limit: 1 // Chỉ lấy nến cuối cùng
        }
      });

      // Binance không cung cấp EMA trực tiếp, nhưng ta có thể tính từ dữ liệu
      // Hoặc sử dụng API khác nếu có
      return response.data[0];
    }, `getBinanceEMA200-${symbol}`);
  }

  // So sánh EMA tính toán với EMA thực tế
  async compareEMA(symbol) {
    try {
      const klineData = await this.getKlineData(symbol);
      const closingPrices = klineData.map(kline => kline.close);
      
      // Tính EMA bằng nhiều cách
      const emaResults = this.calculateEMAMultiple(closingPrices, futuresEMAConfig.EMA.PERIOD);
      
      console.log(`📊 EMA Comparison cho ${symbol}:`);
      console.log(`   Cách 1 (Giá đầu): ${emaResults.method1?.toFixed(6)}`);
      console.log(`   Cách 2 (SMA đầu): ${emaResults.method2?.toFixed(6)}`);
      console.log(`   Cách 3 (SMA động): ${emaResults.method3?.toFixed(6)}`);
      console.log(`   Khuyến nghị: ${emaResults.recommended?.toFixed(6)}`);
      
      return emaResults;
    } catch (error) {
      console.error(`❌ Lỗi so sánh EMA cho ${symbol}:`, error.message);
      return null;
    }
  }

  // Debug chi tiết quá trình tính EMA
  async debugEMA(symbol) {
    try {
      const klineData = await this.getKlineData(symbol);
      const closingPrices = klineData.map(kline => kline.close);
      
      console.log(`🔍 Debug EMA200 cho ${symbol}:`);
      console.log(`   Số nến: ${closingPrices.length}`);
      console.log(`   Giá đầu tiên: ${closingPrices[0]}`);
      console.log(`   Giá cuối cùng: ${closingPrices[closingPrices.length - 1]}`);
      
      const period = futuresEMAConfig.EMA.PERIOD;
      const multiplier = 2 / (period + 1);
      
      console.log(`   Period: ${period}`);
      console.log(`   Multiplier: ${multiplier.toFixed(6)}`);
      
      // Tính SMA đầu tiên
      let sma = 0;
      for (let i = 0; i < period; i++) {
        sma += closingPrices[i];
      }
      sma = sma / period;
      
      console.log(`   SMA đầu tiên (${period} nến): ${sma.toFixed(6)}`);
      
      // Tính EMA từng bước (chỉ 5 bước cuối)
      let ema = sma;
      const steps = Math.min(5, closingPrices.length - period);
      
      for (let i = period; i < period + steps; i++) {
        const oldEma = ema;
        ema = (closingPrices[i] * multiplier) + (ema * (1 - multiplier));
        console.log(`   Bước ${i - period + 1}: EMA = ${ema.toFixed(6)} (từ ${oldEma.toFixed(6)})`);
      }
      
      // Tính EMA cuối cùng
      for (let i = period + steps; i < closingPrices.length; i++) {
        ema = (closingPrices[i] * multiplier) + (ema * (1 - multiplier));
      }
      
      console.log(`   EMA200 cuối cùng: ${ema.toFixed(6)}`);
      
      return ema;
    } catch (error) {
      console.error(`❌ Lỗi debug EMA cho ${symbol}:`, error.message);
      return null;
    }
  }

  // Kiểm tra tín hiệu trading futures (long/short)
  // Logic mới: Sử dụng giá cao nhất/thấp nhất để phát hiện phá vỡ EMA200
  // Tránh bỏ sót tín hiệu khi có rút râu nến (wick rejection)
  async checkFuturesTradingSignal(symbol) {
    try {
      // Lấy dữ liệu nến với retry mechanism
      const klineData = await this.getKlineData(symbol);
      
      if (!klineData || klineData.length < futuresEMAConfig.EMA.PERIOD + 1) {
        console.warn(`⚠️ Không đủ dữ liệu cho ${symbol}: ${klineData ? klineData.length : 0} nến`);
        return null; // Không đủ dữ liệu
      }

      // Lấy giá đóng cửa của các nến
      const closingPrices = klineData.map(kline => kline.close);
      
      // Tính EMA 200
      const ema200 = this.calculateEMA(closingPrices, futuresEMAConfig.EMA.PERIOD);
      
      if (!ema200 || isNaN(ema200)) {
        console.warn(`⚠️ Không thể tính EMA cho ${symbol}`);
        return null;
      }

      // Nến hiện tại và nến trước đó
      const currentCandle = klineData[klineData.length - 1];
      const previousCandle = klineData[klineData.length - 2];
      
      if (!currentCandle || !previousCandle) {
        console.warn(`⚠️ Thiếu dữ liệu nến cho ${symbol}`);
        return null;
      }
      
      const currentHigh = currentCandle.high;
      const currentLow = currentCandle.low;
      const currentClose = currentCandle.close;
      const previousClose = previousCandle.close;
      
      // Kiểm tra giá hợp lệ
      if (isNaN(currentHigh) || isNaN(currentLow) || isNaN(currentClose) || isNaN(previousClose) || 
          currentHigh <= 0 || currentLow <= 0 || currentClose <= 0 || previousClose <= 0) {
        console.warn(`⚠️ Giá không hợp lệ cho ${symbol}: high=${currentHigh}, low=${currentLow}, close=${currentClose}`);
        return null;
      }
      
      // Kiểm tra tín hiệu LONG: 
      // - Giá cao nhất của nến hiện tại > EMA 200 (phá vỡ lên)
      // - Giá đóng cửa của nến trước đó <= EMA 200 (chưa phá vỡ trước đó)
      const isCurrentHighAboveEMA = currentHigh > ema200;
      const wasPreviousCloseBelowEMA = previousClose <= ema200;
      
      // Kiểm tra tín hiệu SHORT:
      // - Giá thấp nhất của nến hiện tại < EMA 200 (phá vỡ xuống)
      // - Giá đóng cửa của nến trước đó >= EMA 200 (chưa phá vỡ trước đó)
      const isCurrentLowBelowEMA = currentLow < ema200;
      const wasPreviousCloseAboveEMA = previousClose >= ema200;
      
      if (isCurrentHighAboveEMA && wasPreviousCloseBelowEMA) {
        // Tín hiệu LONG - giá cao nhất phá vỡ EMA200
        const breakoutPrice = currentHigh;
        const breakoutPercent = ((breakoutPrice - ema200) / ema200 * 100).toFixed(2);
        
        return {
          symbol: symbol,
          signal: 'LONG',
          currentPrice: currentClose,
          previousPrice: previousClose,
          ema200: ema200,
          timestamp: currentCandle.timestamp,
          priceAboveEMAPercent: breakoutPercent,
          crossType: 'BULLISH',
          breakoutPrice: breakoutPrice,
          breakoutType: 'HIGH_BREAKOUT', // Phá vỡ bằng giá cao nhất
          candleInfo: {
            high: currentHigh,
            low: currentLow,
            close: currentClose,
            open: currentCandle.open
          }
        };
      } else if (isCurrentLowBelowEMA && wasPreviousCloseAboveEMA) {
        // Tín hiệu SHORT - giá thấp nhất phá vỡ EMA200
        const breakoutPrice = currentLow;
        const breakoutPercent = ((ema200 - breakoutPrice) / ema200 * 100).toFixed(2);
        
        return {
          symbol: symbol,
          signal: 'SHORT',
          currentPrice: currentClose,
          previousPrice: previousClose,
          ema200: ema200,
          timestamp: currentCandle.timestamp,
          priceBelowEMAPercent: breakoutPercent,
          crossType: 'BEARISH',
          breakoutPrice: breakoutPrice,
          breakoutType: 'LOW_BREAKOUT', // Phá vỡ bằng giá thấp nhất
          candleInfo: {
            high: currentHigh,
            low: currentLow,
            close: currentClose,
            open: currentCandle.open
          }
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ [SERVER ERROR] Error checking EMA cross for ${symbol}:`, error.message);
      
      // Log chi tiết lỗi để debug
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.response) {
        console.error(`   HTTP status: ${error.response.status}`);
        console.error(`   Response data:`, error.response.data);
      }
      
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
      
      // Lấy danh sách top coins với retry
      const topCoins = await this.getTopCoinsByMarketCap();
      
      if (!topCoins || topCoins.length === 0) {
        console.warn('⚠️ Không có coins nào để kiểm tra');
        return [];
      }
      
      let logMessage = `📊 Đang kiểm tra ${topCoins.length} coins (rank ${futuresEMAConfig.COIN_RANK.MIN_RANK}-${futuresEMAConfig.COIN_RANK.MAX_RANK})`;
      
      if (futuresEMAConfig.MARKET_CAP.ENABLED) {
        logMessage += ` với market cap <= ${this.formatNumber(futuresEMAConfig.MARKET_CAP.MAX_MARKET_CAP)}`;
      }
      
      console.log(logMessage);

      const tradingSignals = [];
      let processedCount = 0;
      let errorCount = 0;

      // Kiểm tra từng coin với error handling
      for (const coin of topCoins) {
        try {
          const signalData = await this.checkFuturesTradingSignal(coin.symbol);
          
          if (signalData) {
            // Kiểm tra cache để tránh báo trùng
            if (this.isCoinCached(coin.symbol, signalData.signal)) {
              console.log(`📋 ${coin.symbol} đã được cache, bỏ qua`);
              continue;
            }
            
            // Thêm vào cache để tránh báo trùng
            this.addToCache(coin.symbol, signalData.signal, signalData);
            
            tradingSignals.push(signalData);
          }
          
          processedCount++;
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Lỗi xử lý ${coin.symbol}:`, error.message);
          
          // Nếu có quá nhiều lỗi, dừng lại
          if (errorCount > topCoins.length * 0.3) { // 30% lỗi
            console.error(`❌ Quá nhiều lỗi (${errorCount}/${topCoins.length}), dừng kiểm tra`);
            break;
          }
        }

        // Thêm delay để tránh rate limit và giảm tải server
        await new Promise(resolve => setTimeout(resolve, futuresEMAConfig.CONNECTION.REQUEST_DELAY_MS));
      }

      console.log(`✅ Hoàn thành kiểm tra. Xử lý: ${processedCount}/${topCoins.length}, Lỗi: ${errorCount}, Tín hiệu: ${tradingSignals.length}`);
      return tradingSignals;

    } catch (error) {
      console.error('❌ Error in checkAllCoinsForTradingSignals:', error);
      
      // Log chi tiết lỗi
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.response) {
        console.error(`   HTTP status: ${error.response.status}`);
      }
      
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
💰 **Giá:** ${this.formatPrice(signalData.currentPrice)}
📊 **EMA 200:** ${this.formatPrice(signalData.ema200)}
${signalData.signal === 'LONG' ? 
  `📈 **Khoảng cách:** ${signalData.priceAboveEMAPercent}% trên EMA` :
  `📉 **Khoảng cách:** ${signalData.priceBelowEMAPercent}% dưới EMA`
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

  // Test EMA calculation với nhiều coins
  async testEMACalculation() {
    const testSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
    
    console.log('🔍 Testing EMA200 calculation...');
    
    for (const symbol of testSymbols) {
      try {
        const result = await this.compareEMA(symbol);
        if (result) {
          console.log(`✅ ${symbol}: EMA200 = ${result.recommended?.toFixed(6)}`);
        }
      } catch (error) {
        console.error(`❌ ${symbol}: ${error.message}`);
      }
      
      // Delay để tránh rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Test kết nối Binance API
  async testBinanceConnection() {
    try {
      console.log('🔍 Testing Binance API connection...');
      
      // Test với một request đơn giản
      const response = await this.retryRequest(async () => {
        return await axios.get(`${this.binanceAPI}/api/v3/ping`, this.axiosConfig);
      }, 'testConnection');
      
      console.log('✅ Binance API connection test successful');
      return { success: true, message: 'Connection OK' };
      
    } catch (error) {
      console.error('❌ Binance API connection test failed:', error.message);
      return { 
        success: false, 
        message: `Connection failed: ${error.message}`,
        error: error.code || 'UNKNOWN'
      };
    }
  }

  // Lấy thông tin cấu hình kết nối
  getConnectionInfo() {
    return {
      binanceAPI: this.binanceAPI,
      timeout: this.axiosConfig.timeout,
      maxRetries: this.retryConfig.maxRetries,
      retryDelay: this.retryConfig.retryDelay,
      requestDelay: futuresEMAConfig.CONNECTION.REQUEST_DELAY_MS,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNABORTED']
    };
  }
}

module.exports = FuturesEMAMonitorService;
