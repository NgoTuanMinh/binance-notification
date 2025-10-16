const express = require('express');
const cors = require('cors');
const BinanceAPI = require('./binanceAPI');
const config = require('./config');
const VolumeMonitorScheduler = require('./features/volumeMonitor/volumeMonitorScheduler');
const VolumeMonitorService = require('./features/volumeMonitor/volumeMonitorService');
const EMAMonitorScheduler = require('./features/emaMonitor/emaMonitorScheduler');
const TelegramService = require('./telegramService');
const telegramBotRoutes = require('./features/telegramBot/telegramBotRoutes');

// Console log capture
const consoleLogs = [];
const maxLogLines = 1000;

// Override console methods để capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function addTimestampToLog(level, ...args) {
  const now = new Date();
  // Chuyển đổi sang timezone +7 (GMT+7)
  const timestamp = new Date(now.getTime() + (7 * 60 * 60 * 1000)).toISOString().replace('Z', '+07:00');
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  const logEntry = {
    timestamp,
    level,
    message,
    fullLine: `[${timestamp}] [${level.toUpperCase()}] ${message}`
  };
  
  consoleLogs.push(logEntry);
  
  // Giữ chỉ 1000 dòng gần nhất
  if (consoleLogs.length > maxLogLines) {
    consoleLogs.shift();
  }
}

console.log = function(...args) {
  addTimestampToLog('log', ...args);
  originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
  addTimestampToLog('error', ...args);
  originalConsoleError.apply(console, args);
};

console.warn = function(...args) {
  addTimestampToLog('warn', ...args);
  originalConsoleWarn.apply(console, args);
};

// Utility function để format số
function formatNumber(num) {
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

// Utility function để format giá
function formatPrice(price) {
  if (price >= 1) {
    return '$' + price.toFixed(2);
  } else if (price >= 0.01) {
    return '$' + price.toFixed(4);
  } else {
    return '$' + price.toFixed(6);
  }
}

const app = express();
const binanceAPI = new BinanceAPI();
const volumeMonitorScheduler = new VolumeMonitorScheduler();
const volumeMonitorService = new VolumeMonitorService();
const emaMonitorScheduler = new EMAMonitorScheduler();
const telegramService = new TelegramService();

// Middleware
app.use(cors());
app.use(express.json());

// Telegram Bot routes
app.use('/api/telegram-bot', telegramBotRoutes);

// Chuyển đổi thời gian từ string sang timestamp
function parseDateTime(dateTimeStr) {
  // Format: "19:00 ngày 10/10/2025" -> timestamp
  const parts = dateTimeStr.split(' ');
  const time = parts[0]; // "19:00"
  const date = parts[2]; // "10/10/2025"
  
  const [day, month, year] = date.split('/');
  const [hour, minute] = time.split(':');
  
  return new Date(year, month - 1, day, hour, minute).getTime();
}

// API endpoint chính
app.get('/api/coins', async (req, res) => {
  try {
    // Thời gian từ 19:00 ngày 10/10/2025 đến 05:00 ngày 11/10/2025
    const startTime = parseDateTime('19:00 ngày 10/10/2025');
    const endTime = parseDateTime('05:00 ngày 11/10/2025');
    const sortBy = 'marketCap'; // marketCap, priceDropPercent, volume24h
    
    console.log(`Tìm kiếm coins từ ${new Date(startTime).toLocaleString()} đến ${new Date(endTime).toLocaleString()}`);
    
    // Lấy danh sách coins thỏa mãn điều kiện
    const filteredCoins = await binanceAPI.filterCoinsByPriceDrop(
      startTime, 
      endTime, 
      20, // Giảm tối thiểu 20%
      30  // Giảm tối đa 30%
    );
    
    // Sắp xếp theo vốn hóa (đã được sắp xếp trong getTopCoinsByMarketCap)
    const sortedCoins = filteredCoins.sort((a, b) => b[sortBy] - a[sortBy]);
    
    // Format response
    const response = {
      success: true,
      data: {
        totalCoins: sortedCoins.length,
        timeRange: {
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString()
        },
        criteria: {
          marketCapRank: '20-100',
          priceDropRange: '20-30%'
        },
        coins: sortedCoins.map(coin => ({
          symbol: coin.symbol,
          currentPrice: formatPrice(coin.price),
          // currentPriceRaw: coin.price,
          marketCap: formatNumber(coin.marketCap) + ' $',
          // marketCapRaw: coin.marketCap,
          priceDropPercent: coin.priceDropPercent.toFixed(2) + '%',
          // priceDropPercentRaw: coin.priceDropPercent,
          volume24h: formatNumber(coin.volume) + ' $',
          // volume24hRaw: coin.volume
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error in /api/coins endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API endpoint để lấy thông tin chi tiết của một coin
app.get('/api/coins/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbolWithUSDT = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
    
    const startTime = parseDateTime('19:00 ngày 10/10/2025');
    const endTime = parseDateTime('05:00 ngày 11/10/2025');
    
    const historicalData = await binanceAPI.getHistoricalPrice(symbolWithUSDT, startTime, endTime);
    const priceChangePercent = binanceAPI.calculatePriceChangePercentage(historicalData);
    
    res.json({
      success: true,
      data: {
        symbol: symbolWithUSDT,
        priceChangePercent: priceChangePercent ? priceChangePercent.toFixed(2) + '%' : 'N/A',
        priceChangePercentRaw: priceChangePercent,
        historicalData: historicalData.map(candle => ({
          timestamp: new Date(candle[0]).toISOString(),
          open: formatPrice(parseFloat(candle[1])),
          openRaw: parseFloat(candle[1]),
          high: formatPrice(parseFloat(candle[2])),
          highRaw: parseFloat(candle[2]),
          low: formatPrice(parseFloat(candle[3])),
          lowRaw: parseFloat(candle[3]),
          close: formatPrice(parseFloat(candle[4])),
          closeRaw: parseFloat(candle[4]),
          volume: formatNumber(parseFloat(candle[5])) + ' $',
          volumeRaw: parseFloat(candle[5])
        }))
      }
    });
  } catch (error) {
    console.error(`Error fetching details for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coin details',
      message: error.message
    });
  }
});

// Volume Monitor API endpoints
app.get('/api/volume-monitor/status', (req, res) => {
  try {
    const status = volumeMonitorScheduler.getStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get volume monitor status',
      message: error.message
    });
  }
});

app.post('/api/volume-monitor/start', (req, res) => {
  try {
    volumeMonitorScheduler.start();
    res.json({
      success: true,
      message: 'Volume monitor scheduler started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start volume monitor',
      message: error.message
    });
  }
});

app.post('/api/volume-monitor/stop', (req, res) => {
  try {
    volumeMonitorScheduler.stop();
    res.json({
      success: true,
      message: 'Volume monitor scheduler stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop volume monitor',
      message: error.message
    });
  }
});

app.post('/api/volume-monitor/restart', (req, res) => {
  try {
    volumeMonitorScheduler.restart();
    res.json({
      success: true,
      message: 'Volume monitor scheduler restarted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to restart volume monitor',
      message: error.message
    });
  }
});

app.get('/api/volume-monitor/cache', (req, res) => {
  try {
    const cacheInfo = volumeMonitorService.getCacheInfo();
    res.json({
      success: true,
      data: cacheInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache info',
      message: error.message
    });
  }
});

app.delete('/api/volume-monitor/cache', (req, res) => {
  try {
    volumeMonitorService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

app.post('/api/volume-monitor/test', async (req, res) => {
  try {
    await volumeMonitorScheduler.testConnections();
    res.json({
      success: true,
      message: 'Connection test completed. Check console for results.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      message: error.message
    });
  }
});

app.post('/api/volume-monitor/run-once', async (req, res) => {
  try {
    const volumeSpikes = await volumeMonitorService.checkAllCoinsForVolumeSpikes();
    res.json({
      success: true,
      data: {
        volumeSpikes: volumeSpikes,
        count: volumeSpikes.length
      },
      message: `Found ${volumeSpikes.length} volume spikes`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to run volume check',
      message: error.message
    });
  }
});

// EMA Monitor API endpoints
app.get('/api/ema-monitor/status', (req, res) => {
  try {
    const status = emaMonitorScheduler.getStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get EMA monitor status',
      message: error.message
    });
  }
});

app.post('/api/ema-monitor/start', (req, res) => {
  try {
    emaMonitorScheduler.start();
    res.json({
      success: true,
      message: 'EMA monitor scheduler started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start EMA monitor',
      message: error.message
    });
  }
});

app.post('/api/ema-monitor/stop', (req, res) => {
  try {
    emaMonitorScheduler.stop();
    res.json({
      success: true,
      message: 'EMA monitor scheduler stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop EMA monitor',
      message: error.message
    });
  }
});

app.post('/api/ema-monitor/restart', (req, res) => {
  try {
    emaMonitorScheduler.restart();
    res.json({
      success: true,
      message: 'EMA monitor scheduler restarted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to restart EMA monitor',
      message: error.message
    });
  }
});

app.get('/api/ema-monitor/cache', (req, res) => {
  try {
    const cacheInfo = emaMonitorScheduler.emaMonitor.getCacheInfo();
    res.json({
      success: true,
      data: cacheInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get EMA monitor cache info',
      message: error.message
    });
  }
});

app.delete('/api/ema-monitor/cache', (req, res) => {
  try {
    emaMonitorScheduler.emaMonitor.clearCache();
    res.json({
      success: true,
      message: 'EMA monitor cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear EMA monitor cache',
      message: error.message
    });
  }
});

app.post('/api/ema-monitor/test', async (req, res) => {
  try {
    await emaMonitorScheduler.testConnections();
    res.json({
      success: true,
      message: 'EMA monitor connection test completed. Check console for results.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'EMA monitor connection test failed',
      message: error.message
    });
  }
});

app.post('/api/ema-monitor/run-once', async (req, res) => {
  try {
    const emaCrosses = await emaMonitorScheduler.emaMonitor.checkAllCoinsForEMACross();
    res.json({
      success: true,
      data: {
        emaCrosses: emaCrosses,
        count: emaCrosses.length
      },
      message: `Found ${emaCrosses.length} EMA crosses`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to run EMA check',
      message: error.message
    });
  }
});

// Console Log API endpoints
app.get('/api/console-logs', (req, res) => {
  try {
    const { lines = 1000, level } = req.query;
    const linesToRead = Math.min(parseInt(lines), 1000); // Giới hạn tối đa 1000 dòng
    
    let filteredLogs = consoleLogs;
    
    // Filter theo level nếu được chỉ định
    if (level && ['log', 'error', 'warn'].includes(level)) {
      filteredLogs = consoleLogs.filter(log => log.level === level);
    }
    
    // Lấy số dòng gần nhất
    const recentLogs = filteredLogs.slice(-linesToRead);
    
    res.json({
      success: true,
      data: {
        logType: 'console',
        totalLogs: consoleLogs.length,
        filteredLogs: filteredLogs.length,
        requestedLines: linesToRead,
        returnedLines: recentLogs.length,
        level: level || 'all',
        // logs: recentLogs.map((log, index) => ({
        //   lineNumber: filteredLogs.length - linesToRead + index + 1,
        //   timestamp: log.timestamp,
        //   level: log.level,
        //   message: log.message,
        //   fullLine: log.fullLine
        // }))
        logs: recentLogs.map(log => log.fullLine)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error reading console logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read console logs',
      message: error.message
    });
  }
});

// API endpoint để clear console logs
app.delete('/api/console-logs', (req, res) => {
  try {
    const initialCount = consoleLogs.length;
    consoleLogs.length = 0; // Clear array
    
    res.json({
      success: true,
      message: `Cleared ${initialCount} console log entries`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error clearing console logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear console logs',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Binance Coin Tracker with Volume Monitor'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(config.PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${config.PORT}`);
  console.log(`📊 API endpoint: http://localhost:${config.PORT}/api/coins`);
  console.log(`🔍 Health check: http://localhost:${config.PORT}/health`);
  console.log(`📈 Volume Monitor API: http://localhost:${config.PORT}/api/volume-monitor/status`);
  console.log(`📉 EMA Monitor API: http://localhost:${config.PORT}/api/ema-monitor/status`);
  console.log(`🤖 Telegram Bot API: http://localhost:${config.PORT}/api/telegram-bot/test`);
  console.log(`📋 Console Logs API: http://localhost:${config.PORT}/api/console-logs`);
  
  // Tự động khởi động volume monitor scheduler
  console.log('🔄 Đang khởi động Volume Monitor Scheduler...');
  volumeMonitorScheduler.start();
  
  // Tự động khởi động EMA monitor scheduler
  console.log('🔄 Đang khởi động EMA Monitor Scheduler...');
  emaMonitorScheduler.start();
  
  // Test kết nối AI Bot
  console.log('🤖 Đang kiểm tra AI Bot...');
  testAIBotConnections();
});

// Test kết nối AI Bot
async function testAIBotConnections() {
  try {
    const TelegramBotHandler = require('./features/telegramBot/telegramBotHandler');
    const CryptoAnalyzer = require('./features/aiAnalyzer/cryptoAnalyzer');
    
    const telegramBot = new TelegramBotHandler();
    const cryptoAnalyzer = new CryptoAnalyzer();
    
    // Test Telegram Bot
    const telegramTest = await telegramBot.testConnection();
    console.log(`📱 Telegram Bot: ${telegramTest.success ? '✅' : '❌'} ${telegramTest.message}`);
    
    // Test Crypto Analyzer
    const analyzerTest = await cryptoAnalyzer.testConnections();
    console.log(`📊 Binance API: ${analyzerTest.binance.success ? '✅' : '❌'} ${analyzerTest.binance.message}`);
    console.log(`🧠 Gemini AI: ${analyzerTest.gemini.success ? '✅' : '❌'} ${analyzerTest.gemini.message}`);
    
    if (telegramTest.success && analyzerTest.binance.success) {
      console.log('🎯 AI Bot sẵn sàng hoạt động!');
      console.log('💬 Sử dụng Telegram Bot với các command: /start, /help, /analyze');
    } else {
      console.log('⚠️ AI Bot cần cấu hình thêm. Kiểm tra .env.local');
    }
    
  } catch (error) {
    console.error('❌ Lỗi kiểm tra AI Bot:', error.message);
  }
}

module.exports = app;
