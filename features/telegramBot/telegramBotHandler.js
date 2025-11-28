require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
// const CryptoAnalyzer = require('../aiAnalyzer/cryptoAnalyzer');
const config = require('../../config');

class TelegramBotHandler {
  constructor() {
    this.botToken = config.TELEGRAM_BOT_TOKEN;
    this.botChatId = config.TELEGRAM_BOT_CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    // this.cryptoAnalyzer = new CryptoAnalyzer();
    this.isConfigured = this.botToken && this.botChatId;
  }

  /**
   * Xử lý webhook từ Telegram
   * @param {object} update - Update object từ Telegram
   */
  async handleUpdate(update) {
    if (!this.isConfigured) {
      console.warn('⚠️ Telegram Bot chưa được cấu hình đúng cách');
      return;
    }

    try {
      const message = update.message;
      if (!message) return;

      const chatId = message.chat.id;
      const text = message.text || '';
      const username = message.from?.username || message.from?.first_name || 'Unknown';

      console.log(`📱 Nhận tin nhắn từ ${username}: ${text}`);

      // Kiểm tra nếu không có text
      if (!text || text.trim() === '') {
        await this.sendMessage(chatId, '❓ Vui lòng gửi một lệnh hợp lệ. Sử dụng /help để xem danh sách lệnh.');
        return;
      }

      // Xử lý các command
      if (text.startsWith('/start')) {
        await this.handleStartCommand(chatId);
      } else if (text.startsWith('/help')) {
        await this.handleHelpCommand(chatId);
      } else if (text.startsWith('/analyze')) {
        await this.handleAnalyzeCommand(chatId, text, username);
      } else {
        await this.handleUnknownCommand(chatId);
      }

    } catch (error) {
      console.error('Error handling Telegram update:', error);
      await this.sendMessage(update.message.chat.id, '❌ Có lỗi xảy ra khi xử lý yêu cầu của bạn.');
    }
  }

  /**
   * Xử lý command /start
   * @param {string} chatId - Chat ID
   */
  async handleStartCommand(chatId) {
    const message = `🚀 **Chào mừng đến với Crypto AI Analyzer!** 🚀

Tôi là bot phân tích kỹ thuật cryptocurrency được hỗ trợ bởi AI Gemini.

**Các lệnh có sẵn:**
/start - Hiển thị thông tin này
/help - Xem hướng dẫn chi tiết
/analyze SYMBOL TIMEFRAME - Phân tích coin

**Ví dụ sử dụng:**
/analyze BTC/USDT 4h
/analyze ETH/USDT 1d
/analyze ADA/USDT 1h

**Khung thời gian hỗ trợ:**
1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M

Hãy thử phân tích coin đầu tiên của bạn! 🎯`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Xử lý command /help
   * @param {string} chatId - Chat ID
   */
  async handleHelpCommand(chatId) {
    const message = `📚 **Hướng dẫn sử dụng chi tiết** 📚

**1. Lệnh phân tích:**
\`/analyze SYMBOL TIMEFRAME\`

**2. Cú pháp:**
- SYMBOL: Mã coin (VD: BTC, ETH, ADA)
- TIMEFRAME: Khung thời gian (VD: 4h, 1d, 1h)

**3. Ví dụ:**
\`/analyze BTC/USDT 4h\`
\`/analyze ETH/USDT 1d\`
\`/analyze ADA/USDT 1h\`

**4. Khung thời gian hỗ trợ:**
• Ngắn hạn: 1m, 3m, 5m, 15m, 30m
• Trung hạn: 1h, 2h, 4h, 6h, 8h, 12h
• Dài hạn: 1d, 3d, 1w, 1M

**5. Chỉ báo kỹ thuật được phân tích:**
• EMA (34, 89) - Xu hướng
• RSI (14) - Momentum
• MACD - Động lượng
• Volume - Xác nhận
• Support/Resistance - Mức giá quan trọng

**6. Kết quả phân tích bao gồm:**
• Đánh giá xu hướng
• Đề xuất giao dịch (Long/Short)
• Entry, Take Profit, Stop Loss
• Đánh giá rủi ro
• Điểm tin cậy (1-10)

**Lưu ý:** Phân tích chỉ mang tính chất tham khảo, không phải lời khuyên đầu tư! ⚠️`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Xử lý command /analyze
   * @param {string} chatId - Chat ID
   * @param {string} text - Text message
   * @param {string} username - Username
   */
  async handleAnalyzeCommand(chatId, text, username) {
    try {
      // Parse command
      const parts = text.split(' ');
      if (parts.length < 3) {
        await this.sendMessage(chatId, 
          '❌ **Cú pháp không đúng!**\n\n' +
          'Sử dụng: `/analyze SYMBOL TIMEFRAME`\n\n' +
          'Ví dụ: `/analyze BTC/USDT 4h`'
        );
        return;
      }

      const symbol = parts[1].toUpperCase();
      const timeframe = parts[2].toLowerCase();

      // Validate timeframe
      const validTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1m'];
      if (!validTimeframes.includes(timeframe)) {
        await this.sendMessage(chatId, 
          '❌ **Khung thời gian không hợp lệ!**\n\n' +
          'Khung thời gian hỗ trợ: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M'
        );
        return;
      }

      // Gửi thông báo đang phân tích
      await this.sendMessage(chatId, 
        `🔍 **Đang phân tích ${symbol} trên khung ${timeframe}...**\n\n` +
        `⏳ Vui lòng chờ trong giây lát...`
      );

      // Thực hiện phân tích
      const result = await this.cryptoAnalyzer.analyzeCoin(symbol, timeframe);

      if (!result.success) {
        await this.sendMessage(chatId, 
          `❌ **Lỗi phân tích ${symbol}:**\n\n${result.error}\n\n` +
          'Vui lòng kiểm tra lại mã coin và thử lại.'
        );
        return;
      }

      // Gửi kết quả phân tích
      await this.sendAnalysisResult(chatId, result, username);

    } catch (error) {
      console.error('Error in handleAnalyzeCommand:', error);
      await this.sendMessage(chatId, 
        '❌ **Có lỗi xảy ra khi phân tích!**\n\n' +
        'Vui lòng thử lại sau hoặc liên hệ admin.'
      );
    }
  }

  /**
   * Gửi kết quả phân tích
   * @param {string} chatId - Chat ID
   * @param {object} result - Kết quả phân tích
   * @param {string} username - Username
   */
  async sendAnalysisResult(chatId, result, username) {
    const { symbol, timeframe, technicalData, aiAnalysis } = result;

    try {
      // Gửi phần thông tin cơ bản trước
      let basicMessage = `📊 **PHÂN TÍCH ${symbol} - ${timeframe.toUpperCase()}**\n\n`;
      basicMessage += `👤 Phân tích cho: ${username}\n`;
      basicMessage += `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n`;

      basicMessage += `💰 **Giá hiện tại:** $${technicalData.price.toFixed(2)}\n`;
      basicMessage += `📈 **EMA:** ${technicalData.ema_summary}\n`;
      basicMessage += `📊 **RSI:** ${technicalData.rsi_summary}\n`;
      basicMessage += `🔄 **MACD:** ${technicalData.macd_summary}\n`;
      basicMessage += `📦 **Volume:** ${technicalData.volume_summary}\n`;
      basicMessage += `🎯 **Support:** $${technicalData.support.toFixed(2)}\n`;
      basicMessage += `🎯 **Resistance:** $${technicalData.resistance.toFixed(2)}\n\n`;

      await this.sendMessage(chatId, this.cleanAIResponse(basicMessage));

      // Làm sạch AI response trước khi gửi
      const cleanedAI = this.cleanAIResponse(aiAnalysis);
      
      // Gửi phân tích AI riêng biệt (có thể dài)
      let aiMessage = `🤖 **PHÂN TÍCH AI:**\n\n${cleanedAI}\n\n`;
      aiMessage += `⚠️ **Lưu ý:** Phân tích chỉ mang tính chất tham khảo, không phải lời khuyên đầu tư!`;

      // Chia nhỏ tin nhắn nếu quá dài (Telegram giới hạn 4096 ký tự)
      if (aiMessage.length > 4000) {
        const chunks = this.splitMessage(aiMessage, 4000);
        for (const chunk of chunks) {
          await this.sendMessage(chatId, chunk);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Delay 1s giữa các tin nhắn
        }
      } else {
        await this.sendMessage(chatId, aiMessage);
      }

    } catch (error) {
      console.error('Error sending analysis result:', error);
      await this.sendMessage(chatId, '❌ Có lỗi khi gửi kết quả phân tích. Vui lòng thử lại.');
    }
  }

  /**
   * Chia nhỏ tin nhắn thành các phần
   * @param {string} message - Tin nhắn cần chia
   * @param {number} maxLength - Độ dài tối đa mỗi phần
   * @returns {string[]} Mảng các phần tin nhắn
   */
  splitMessage(message, maxLength = 4000) {
    const chunks = [];
    let currentChunk = '';
    
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
      currentChunk += line + '\n';
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Xử lý command không xác định
   * @param {string} chatId - Chat ID
   */
  async handleUnknownCommand(chatId) {
    const message = `❓ **Lệnh không được nhận diện!**\n\n` +
      'Sử dụng /help để xem danh sách lệnh có sẵn.\n\n' +
      'Hoặc thử: /analyze BTC/USDT 4h';

    await this.sendMessage(chatId, message);
  }

  /**
   * Gửi message đến Telegram
   * @param {string} chatId - Chat ID
   * @param {string} message - Message content
   * @param {string} parseMode - Parse mode (Markdown, HTML)
   */
  async sendMessage(chatId, message, parseMode = 'Markdown') {
    if (!this.isConfigured) {
      console.warn('⚠️ Telegram Bot chưa được cấu hình');
      return false;
    }

    try {
      // Làm sạch message để tránh lỗi parsing
      const cleanMessage = this.cleanMessage(message, parseMode);
      
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text: cleanMessage,
        parse_mode: parseMode,
        disable_web_page_preview: true
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      if (response.data.ok) {
        console.log(`✅ Đã gửi tin nhắn đến ${chatId}`);
        return true;
      } else {
        console.error('❌ Lỗi gửi Telegram:', response.data.description);
        return false;
      }
    } catch (error) {
      console.error('❌ Lỗi gửi Telegram:', error.response?.data || error.message);
      
      // Thử gửi lại với parse mode khác nếu lỗi parsing
      if (error.response?.status === 400 && parseMode !== 'None') {
        console.log('🔄 Thử gửi lại với parse mode None...');
        return await this.sendMessage(chatId, message, 'None');
      }
      
      // Nếu vẫn lỗi, thử gửi message đơn giản
      if (error.response?.status === 400) {
        try {
          // Tạo message đơn giản nhưng vẫn giữ nội dung quan trọng
          const simpleMessage = message
            .replace(/\*\*/g, '') // Loại bỏ ** nhưng giữ nội dung
            .replace(/`/g, '') // Loại bỏ ` nhưng giữ nội dung
            .replace(/[*_`[\]()~>#+=|{}.!-]/g, '') // Loại bỏ các ký tự đặc biệt khác
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Loại bỏ nhiều dòng trống
            .trim();
            
          const response = await axios.post(`${this.baseUrl}/sendMessage`, {
            chat_id: chatId,
            text: simpleMessage,
            disable_web_page_preview: true
          }, {
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            }
          });
          
          if (response.data.ok) {
            console.log(`✅ Đã gửi tin nhắn đơn giản đến ${chatId}`);
            return true;
          }
        } catch (fallbackError) {
          console.error('❌ Lỗi gửi tin nhắn đơn giản:', fallbackError.message);
        }
      }
      
      return false;
    }
  }

  /**
   * Làm sạch AI response để tương thích với Telegram Markdown
   * @param {string} aiResponse - AI response gốc
   * @returns {string} AI response đã được làm sạch
   */
  cleanAIResponse(aiResponse) {
    return aiResponse
      // Giữ nguyên ký tự tiếng Việt, chỉ loại bỏ ký tự control
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Loại bỏ ký tự control
      .replace(/\*\*\s*\*\*/g, '') // Loại bỏ ** rỗng
      .replace(/\*\*\s*$/gm, '') // Loại bỏ ** ở cuối dòng
      .replace(/^\s*\*\*/gm, '') // Loại bỏ ** ở đầu dòng
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Loại bỏ nhiều dòng trống
      .replace(/\\\./g, '.') // Khôi phục dấu chấm bị escape
      .replace(/\\\(/g, '(') // Khôi phục dấu ngoặc đơn
      .replace(/\\\)/g, ')') // Khôi phục dấu ngoặc đơn
      .trim();
  }

  /**
   * Làm sạch message để tránh lỗi parsing
   * @param {string} message - Message gốc
   * @param {string} parseMode - Parse mode
   * @returns {string} Message đã được làm sạch
   */
  cleanMessage(message, parseMode) {
    if (parseMode === 'HTML') {
      // Escape các ký tự HTML đặc biệt
      return message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    } else if (parseMode === 'Markdown') {
      // Chỉ escape các ký tự thực sự gây lỗi trong Markdown
      // Giữ nguyên ** và ` để formatting hoạt động
      // Không escape dấu chấm để tránh lỗi hiển thị
      return message
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/#/g, '\\#')
        .replace(/\+/g, '\\+')
        .replace(/-/g, '\\-')
        .replace(/=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/!/g, '\\!');
    }
    
    return message;
  }

  /**
   * Test kết nối
   * @returns {object} Kết quả test
   */
  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Telegram Bot chưa được cấu hình đúng cách'
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
}

module.exports = TelegramBotHandler;
