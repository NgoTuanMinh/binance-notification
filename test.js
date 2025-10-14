const axios = require('axios');

// Test script để demo API
async function testAPI() {
  const baseURL = 'http://localhost:3010';
  
  try {
    console.log('🔍 Testing Binance Coin Tracker API...\n');
    
    // Test health endpoint
    console.log('1. Testing health endpoint:');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log('');
    
    // Test main coins endpoint
    console.log('2. Testing main coins endpoint:');
    const coinsResponse = await axios.get(`${baseURL}/api/coins`);
    const data = coinsResponse.data.data;
    
    console.log(`✅ Found ${data.totalCoins} coins matching criteria`);
    console.log(`📅 Time range: ${data.timeRange.start} to ${data.timeRange.end}`);
    console.log(`📊 Criteria: Market cap rank ${data.criteria.marketCapRank}, Price drop ${data.criteria.priceDropRange}`);
    console.log('');
    
    // Display top 5 coins
    console.log('3. Top 5 coins by market cap:');
    data.coins.slice(0, 5).forEach((coin, index) => {
      console.log(`${index + 1}. ${coin.symbol}`);
      console.log(`   💰 Price: ${coin.currentPrice}`);
      console.log(`   📈 Market Cap: ${coin.marketCap}`);
      console.log(`   📉 Price Drop: ${coin.priceDropPercent}`);
      console.log(`   📊 Volume 24h: ${coin.volume24h}`);
      console.log('');
    });
    
    // Test specific coin endpoint
    if (data.coins.length > 0) {
      const firstCoin = data.coins[0].symbol.replace('USDT', '');
      console.log(`4. Testing specific coin endpoint for ${firstCoin}:`);
      try {
        const coinResponse = await axios.get(`${baseURL}/api/coins/${firstCoin}`);
        console.log(`✅ Coin details for ${firstCoin}:`);
        console.log(`   📉 Price change: ${coinResponse.data.data.priceChangePercent}`);
        console.log(`   📊 Historical data points: ${coinResponse.data.data.historicalData.length}`);
      } catch (error) {
        console.log(`❌ Error fetching ${firstCoin} details:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = testAPI;
