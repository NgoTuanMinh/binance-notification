const axios = require('axios');
const config = require('./config');

class BinanceAPI {
  constructor() {
    this.baseURL = config.BINANCE_API_BASE_URL;
  }

  // Lấy danh sách tất cả các coin và thông tin vốn hóa
  async getAllCoinsInfo() {
    try {
      const response = await axios.get(`${this.baseURL}/api/v3/ticker/24hr`);
      return response.data;
    } catch (error) {
      console.error('Error fetching coins info:', error.message);
      throw error;
    }
  }

  // Lấy giá lịch sử của một coin trong khoảng thời gian cụ thể
  async getHistoricalPrice(symbol, startTime, endTime) {
    try {
      const response = await axios.get(`${this.baseURL}/api/v3/klines`, {
        params: {
          symbol: symbol,
          interval: '1h',
          startTime: startTime,
          endTime: endTime,
          limit: 1000
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching historical price for ${symbol}:`, error.message);
      throw error;
    }
  }

  // Lấy top coins theo vốn hóa (rank từ 20-100)
  async getTopCoinsByMarketCap() {
    try {
      const coins = await this.getAllCoinsInfo();
      
      // Lọc các coin có USDT pair và tính toán vốn hóa
      const coinsWithMarketCap = coins
        .filter(coin => coin.symbol.endsWith('USDT'))
        .map(coin => ({
          symbol: coin.symbol,
          price: parseFloat(coin.lastPrice),
          volume: parseFloat(coin.volume),
          marketCap: parseFloat(coin.lastPrice) * parseFloat(coin.volume), // Ước tính vốn hóa
          priceChangePercent: parseFloat(coin.priceChangePercent)
        }))
        .sort((a, b) => b.marketCap - a.marketCap);

      // Lấy top 20-100
      return coinsWithMarketCap.slice(19, 100); // Index 19-99 (top 20-100)
    } catch (error) {
      console.error('Error getting top coins:', error.message);
      throw error;
    }
  }

  // Tính toán phần trăm thay đổi giá trong khoảng thời gian
  calculatePriceChangePercentage(historicalData) {
    if (!historicalData || historicalData.length < 2) {
      return null;
    }

    const firstPrice = parseFloat(historicalData[0][4]); // Giá đóng cửa đầu tiên
    const lastPrice = parseFloat(historicalData[historicalData.length - 1][4]); // Giá đóng cửa cuối cùng
    
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }

  // Lọc coins theo điều kiện giảm giá 20-30% trong khoảng thời gian
  async filterCoinsByPriceDrop(startTime, endTime, minDropPercent = 20, maxDropPercent = 30) {
    try {
      const topCoins = await this.getTopCoinsByMarketCap();
      const filteredCoins = [];

      for (const coin of topCoins) {
        try {
          const historicalData = await this.getHistoricalPrice(coin.symbol, startTime, endTime);
          const priceChangePercent = this.calculatePriceChangePercentage(historicalData);
          
          if (priceChangePercent !== null && 
              priceChangePercent <= -minDropPercent && 
              priceChangePercent >= -maxDropPercent) {
            
            filteredCoins.push({
              ...coin,
              priceDropPercent: Math.abs(priceChangePercent),
              historicalData: historicalData.slice(0, 5) // Chỉ lưu 5 điểm dữ liệu đầu tiên để tiết kiệm bộ nhớ
            });
          }
        } catch (error) {
          console.warn(`Skipping ${coin.symbol} due to error:`, error.message);
          continue;
        }
      }

      return filteredCoins;
    } catch (error) {
      console.error('Error filtering coins by price drop:', error.message);
      throw error;
    }
  }
}

module.exports = BinanceAPI;
