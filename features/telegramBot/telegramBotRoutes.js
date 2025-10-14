const express = require('express');
const TelegramBotHandler = require('./telegramBotHandler');
const CryptoAnalyzer = require('../aiAnalyzer/cryptoAnalyzer');

const router = express.Router();
const telegramBot = new TelegramBotHandler();
const cryptoAnalyzer = new CryptoAnalyzer();

// Webhook endpoint để nhận updates từ Telegram
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // Xử lý update
    await telegramBot.handleUpdate(update);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API endpoint để phân tích coin trực tiếp
router.post('/analyze', async (req, res) => {
  try {
    const { symbol, timeframe } = req.body;
    
    if (!symbol || !timeframe) {
      return res.status(400).json({
        success: false,
        error: 'Missing symbol or timeframe'
      });
    }

    const result = await cryptoAnalyzer.analyzeCoin(symbol, timeframe);
    
    res.json(result);
  } catch (error) {
    console.error('Error in analyze endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint để test kết nối
router.get('/test', async (req, res) => {
  try {
    const telegramTest = await telegramBot.testConnection();
    const analyzerTest = await cryptoAnalyzer.testConnections();
    
    res.json({
      success: true,
      telegram: telegramTest,
      analyzer: analyzerTest
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint để lấy thông tin bot
router.get('/info', async (req, res) => {
  try {
    const telegramTest = await telegramBot.testConnection();
    
    res.json({
      success: true,
      bot: telegramTest,
      commands: [
        '/start - Bắt đầu và hướng dẫn sử dụng',
        '/help - Xem hướng dẫn chi tiết',
        '/analyze SYMBOL TIMEFRAME - Phân tích coin'
      ],
      example: '/analyze BTC/USDT 4h'
    });
  } catch (error) {
    console.error('Error in info endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
