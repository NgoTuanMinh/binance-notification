require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ccxt = require('ccxt');
const ti = require('technicalindicators');
const config = require('../../config');

class CryptoAnalyzer {
  constructor() {
    // Khởi tạo Gemini AI
    this.ai = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.model = this.ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Khởi tạo sàn giao dịch Binance
    this.binance = new ccxt.binance({
      apiKey: '', // Không cần API key cho public data
      secret: '',
      sandbox: false,
      enableRateLimit: true
    });
  }

  /**
   * Format số volume để dễ đọc
   * @param {number} volume - Giá trị volume
   * @returns {string} Volume đã format
   */
  formatVolume(volume) {
    if (volume >= 1e9) {
      return `${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
      return `${(volume / 1e6).toFixed(2)}M`;
    } else if (volume >= 1e3) {
      return `${(volume / 1e3).toFixed(2)}K`;
    } else {
      return volume.toFixed(2);
    }
  }

  /**
   * Thu thập OHLCV và tính toán các chỉ báo kỹ thuật cần thiết.
   * (Phần này không liên quan đến Gemini, giữ nguyên)
   */
  async calculateIndicators(symbol, timeframe) {
    try {
      let ohlcv;
      try {
        ohlcv = await this.binance.fetchOHLCV(symbol, timeframe, undefined, 200);
      } catch (e) {
        console.error(`Lỗi khi lấy dữ liệu OHLCV cho ${symbol}:`, e);
        return null;
      }

      if (!ohlcv || ohlcv.length < 100) {
        console.error('Không đủ dữ liệu nến để tính toán chỉ báo.');
        return null;
      }

      const close = ohlcv.map(candle => candle[4]);
      const volumes = ohlcv.map(candle => candle[5]);
      const highs = ohlcv.map(candle => candle[2]);
      const lows = ohlcv.map(candle => candle[3]);
      const currentPrice = close[close.length - 1];
      const lastVolume = volumes[volumes.length - 1];
      const ema34 = ti.EMA.calculate({ period: 34, values: close });
      const ema89 = ti.EMA.calculate({ period: 89, values: close });
      const lastEma34 = ema34[ema34.length - 1];
      const lastEma89 = ema89[ema89.length - 1];
      const rsi14 = ti.RSI.calculate({ period: 14, values: close });
      const lastRsi14 = rsi14[rsi14.length - 1];
      const macdResult = ti.MACD.calculate({
        fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, values: close
      });
      const lastMacd = macdResult[macdResult.length - 1];
      const macdLine = lastMacd.MACD;
      const signalLine = lastMacd.signal;
      const avgVolume = volumes.slice(-21, -1).reduce((sum, v) => sum + v, 0) / 20;
      const recentHighs = highs.slice(-50, -1);
      const recentLows = lows.slice(-50, -1);
      const resistance = Math.max(...recentHighs);
      const support = Math.min(...recentLows);
      let emaStatus = "";
      if (currentPrice > lastEma34 && currentPrice > lastEma89) {
        emaStatus = `Giá ($${currentPrice.toFixed(2)}) đang nằm trên cả EMA34 ($${lastEma34.toFixed(2)}) và EMA89 ($${lastEma89.toFixed(2)}), thể hiện xu hướng tăng.`;
        if (lastEma34 > lastEma89) {
          emaStatus += " (EMA34 đang cắt trên EMA89 - Gold Cross)";
        }
      } else if (currentPrice < lastEma34 && currentPrice < lastEma89) {
        emaStatus = `Giá ($${currentPrice.toFixed(2)}) đang nằm dưới cả EMA34 ($${lastEma34.toFixed(2)}) và EMA89 ($${lastEma89.toFixed(2)}), thể hiện xu hướng giảm.`;
      } else {
        emaStatus = "Giá đang dao động quanh các đường EMA, thị trường đang đi ngang.";
      }
      let rsiSummary = "";
      if (lastRsi14 >= 70) {
        rsiSummary = `Đang ở mức ${lastRsi14.toFixed(2)}, vùng Quá mua (Overbought).`;
      } else if (lastRsi14 <= 30) {
        rsiSummary = `Đang ở mức ${lastRsi14.toFixed(2)}, vùng Quá bán (Oversold).`;
      } else {
        rsiSummary = `Đang ở mức ${lastRsi14.toFixed(2)}, vùng trung lập.`;
      }
      let macdSummary = "";
      if (macdLine > signalLine && macdLine > 0) {
        macdSummary = `Đường MACD (${macdLine.toFixed(4)}) đang cắt lên trên đường Signal (${signalLine.toFixed(4)}) và nằm trên mức 0, xác nhận động lượng tăng.`;
      } else if (macdLine < signalLine && macdLine < 0) {
        macdSummary = `Đường MACD (${macdLine.toFixed(4)}) đang cắt xuống dưới đường Signal (${signalLine.toFixed(4)}) và nằm dưới mức 0, xác nhận động lượng giảm.`;
      } else {
        macdSummary = "Đang nằm gần mức 0, thị trường thiếu xu hướng rõ rệt.";
      }
      const volumeDiffPercent = ((lastVolume - avgVolume) / avgVolume) * 100;
      const formattedLastVolume = this.formatVolume(lastVolume);
      const formattedAvgVolume = this.formatVolume(avgVolume);
      
      let volumeSummary = `Volume hiện tại là ${formattedLastVolume} so với Volume trung bình (${formattedAvgVolume}). `;
      if (volumeDiffPercent >= 20) {
        volumeSummary += `Cao hơn ${volumeDiffPercent.toFixed(2)}%, xác nhận sức mạnh của động thái giá hiện tại.`;
      } else if (volumeDiffPercent <= -20) {
        volumeSummary += `Thấp hơn ${Math.abs(volumeDiffPercent).toFixed(2)}%, cho thấy sự thiếu quan tâm của thị trường.`;
      } else {
        volumeSummary += "Ở mức trung bình, chưa có sự xác nhận mạnh.";
      }
      return {
        symbol,
        timeframe,
        price: currentPrice,
        ema_summary: emaStatus,
        rsi_value: lastRsi14,
        rsi_summary: rsiSummary,
        macd_summary: macdSummary,
        volume_summary: volumeSummary,
        support: support,
        resistance: resistance,
      };
    } catch (error) {
      console.error('Error in calculateIndicators:', error);
      return null;
    }
  }

  /**
   * Phân tích coin bằng Gemini AI
   */
  async analyzeCoin(symbol, timeframe) {
    try {
      const technicalData = await this.calculateIndicators(symbol, timeframe);
      
      if (!technicalData) {
        return {
          success: false,
          error: 'Không thể lấy dữ liệu kỹ thuật'
        };
      }

      const prompt = this.createAnalysisPrompt(technicalData);
      // Gửi đến Gemini AI
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = response.text();

      return {
        success: true,
        symbol: technicalData.symbol,
        timeframe: technicalData.timeframe,
        technicalData: technicalData,
        aiAnalysis: analysis
      };

    } catch (error) {
      console.error('Lỗi Gemini trong analyzeCoin:', error);
      // Lỗi từ Gemini bây giờ sẽ rõ ràng hơn
      return {
        success: false,
        error: `Lỗi Gemini: ${error.message}`
      };
    }
  }

  /**
   * Tạo prompt phân tích cho Gemini
   * (Phần này không cần sửa, giữ nguyên)
   */
  createAnalysisPrompt(technicalData) {
    return `Bạn hãy đóng vai một nhà phân tích kỹ thuật chuyên nghiệp. Tôi muốn phân tích về đồng ${technicalData.symbol} trên khung thời gian ${technicalData.timeframe} để tìm kiếm cơ hội giao dịch trong 24 giờ tới.

Dữ liệu kỹ thuật hiện tại:
Giá: $${technicalData.price.toFixed(2)}.
EMA: ${technicalData.ema_summary}
RSI(14): ${technicalData.rsi_summary}
MACD: ${technicalData.macd_summary}
Volume: ${technicalData.volume_summary}
Hỗ trợ/Kháng cự: Vùng hỗ trợ gần nhất là $${technicalData.support.toFixed(2)}. Vùng kháng cự mạnh là $${technicalData.resistance.toFixed(2)}.

Dựa trên các thông tin trên, hãy:
1. Đánh giá xu hướng hiện tại của ${technicalData.symbol} (Tăng, Giảm, Đi ngang).
2. Đề xuất 2 phương án giao dịch (Mua/Long và Bán/Short) bao gồm:
   - Vùng vào lệnh (Entry).
   - Mục tiêu chốt lời (Take Profit).
   - Điểm dừng lỗ (Stop Loss).
3. Nêu rõ các rủi ro tiềm ẩn cho mỗi phương án.
4. Đưa ra điểm số từ 1-10 cho mức độ tin cậy của phân tích này.

Hãy trả lời bằng tiếng Việt và trình bày một cách chuyên nghiệp, dễ hiểu.`;
  }

  /**
   * Kiểm tra kết nối với các API
   */
  async testConnections() {
    const results = {
      binance: { success: false, message: '' },
      gemini: { success: false, message: '' }
    };

    // Test Binance (giữ nguyên)
    try {
      await this.binance.fetchTicker('BTC/USDT');
      results.binance = { success: true, message: 'Kết nối Binance thành công' };
    } catch (error) {
      results.binance = { success: false, message: `Lỗi Binance: ${error.message}` };
    }

    // Test Gemini
    try {
      const result = await this.model.generateContent('Test connection');
      await result.response;
      results.gemini = { success: true, message: 'Kết nối Gemini thành công' };
    } catch (error) {
      results.gemini = { success: false, message: `Lỗi Gemini: ${error.message}` };
    }

    return results;
  }
}

module.exports = CryptoAnalyzer;