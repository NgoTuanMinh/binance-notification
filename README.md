pkill -f "node telegramBotPolling.js" && pkill -f "node server.js" && sleep 3

# Binance Crypto Analysis System

Hệ thống phân tích cryptocurrency toàn diện với AI Gemini và Volume Monitor tự động.

## 🚀 Tính năng chính

### 📊 Volume Monitor

- 🔍 **Kiểm tra tự động**: Chạy mỗi 15 phút để kiểm tra volume spikes
- 📊 **Top coins**: Theo dõi coins rank 20-100 theo market cap
- 💰 **Market cap filter**: Chỉ theo dõi coins có market cap ≤ 1B USD
- 📈 **Khung M15**: Sử dụng dữ liệu nến 15 phút
- 🚨 **Cảnh báo thông minh**: Chỉ báo khi volume tăng gấp 10 lần trung bình 1000 nến
- 💾 **Cache thông minh**: Tránh báo trùng trong 4 giờ
- 📱 **Telegram**: Gửi thông báo chi tiết qua Telegram bot

### 🤖 AI Analysis Bot

- 🧠 **Gemini AI**: Phân tích kỹ thuật bằng AI Gemini
- 📈 **Chỉ báo kỹ thuật**: EMA, RSI, MACD, Volume, Support/Resistance
- 💬 **Telegram Bot**: Tương tác qua các command
- ⚡ **Real-time**: Phân tích dữ liệu real-time từ Binance
- 🎯 **Giao dịch**: Đề xuất entry, take profit, stop loss

## 📁 Cấu trúc Project

```
Binance/
├── features/
│   ├── volumeMonitor/          # Volume monitoring system
│   │   ├── volumeMonitorConfig.js
│   │   ├── volumeMonitorService.js
│   │   ├── volumeMonitorScheduler.js
│   │   └── volumeMonitor.js
│   ├── aiAnalyzer/             # AI analysis system
│   │   └── cryptoAnalyzer.js
│   └── telegramBot/           # Telegram bot system
│       ├── telegramBotHandler.js
│       └── telegramBotRoutes.js
├── server.js                   # Main server
├── config.js                   # Configuration
├── telegramService.js          # Telegram notification service
└── .env.local                  # Environment variables
```

## 🚀 Setup trên Server Mới

**Bạn đang setup trên server mới (chưa có gì cài đặt)?**

👉 **Xem hướng dẫn chi tiết**: [`SETUP_SERVER_GUIDE.md`](./SETUP_SERVER_GUIDE.md) - Hướng dẫn từ đầu (cài Git, Node.js, PM2, Nginx...)

👉 **Hoặc xem tóm tắt nhanh**: [`QUICK_SETUP.md`](./QUICK_SETUP.md) - Cho người đã có kinh nghiệm

**Script tự động setup cơ bản:**
```bash
# Trên server Ubuntu mới, chạy với quyền root
sudo ./setup-server.sh
```

---

## 🛠️ Cài đặt (Local Development)

### 1. Clone và cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình Environment Variables

Tạo file `.env.local` từ `env.example`:

```bash
cp env.example .env.local
```

Cấu hình các biến:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_NOTIFICATION_CHAT_ID=your_notification_chat_id_here
TELEGRAM_BOT_CHAT_ID=your_bot_chat_id_here

# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3010
```

### 3. Cấu hình Telegram Bot

1. Tạo bot mới với [@BotFather](https://t.me/BotFather)
2. Lấy Bot Token và điền vào `TELEGRAM_BOT_TOKEN`
3. Lấy Chat ID và điền vào `TELEGRAM_NOTIFICATION_CHAT_ID` và `TELEGRAM_BOT_CHAT_ID`

### 4. Cấu hình Gemini AI

1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Tạo API key mới
3. Điền vào `GEMINI_API_KEY`

## 🚀 Chạy ứng dụng

### Chạy server đầy đủ

```bash
npm start
```

### Chỉ chạy Volume Monitor

```bash
npm run volume-monitor
```

### Development mode

```bash
npm run dev
```

## 📱 Telegram Bot Commands

### Các lệnh có sẵn:

- `/start` - Bắt đầu và hướng dẫn sử dụng
- `/help` - Xem hướng dẫn chi tiết
- `/analyze SYMBOL TIMEFRAME` - Phân tích coin

### Ví dụ sử dụng:

```
/analyze BTC/USDT 4h
/analyze ETH/USDT 1d
/analyze ADA/USDT 1h
```

### Khung thời gian hỗ trợ:

- **Ngắn hạn**: 1m, 3m, 5m, 15m, 30m
- **Trung hạn**: 1h, 2h, 4h, 6h, 8h, 12h
- **Dài hạn**: 1d, 3d, 1w, 1M

## 🔧 API Endpoints

### Volume Monitor API

- `GET /api/volume-monitor/status` - Xem trạng thái scheduler
- `POST /api/volume-monitor/start` - Bắt đầu scheduler
- `POST /api/volume-monitor/stop` - Dừng scheduler
- `POST /api/volume-monitor/run-once` - Chạy kiểm tra 1 lần
- `GET /api/volume-monitor/cache` - Xem thông tin cache
- `DELETE /api/volume-monitor/cache` - Xóa cache

### Telegram Bot API

- `POST /api/telegram-bot/webhook` - Webhook cho Telegram updates
- `POST /api/telegram-bot/analyze` - Phân tích coin trực tiếp
- `GET /api/telegram-bot/test` - Test kết nối
- `GET /api/telegram-bot/info` - Thông tin bot

### Ví dụ sử dụng API:

```bash
# Test kết nối
curl -X GET http://localhost:3010/api/telegram-bot/test

# Phân tích coin
curl -X POST http://localhost:3010/api/telegram-bot/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC/USDT","timeframe":"4h"}'

# Xem trạng thái volume monitor
curl -X GET http://localhost:3010/api/volume-monitor/status
```

## ⚙️ Cấu hình

### Volume Monitor Configuration

Tất cả cấu hình trong `features/volumeMonitor/volumeMonitorConfig.js`:

```javascript
module.exports = {
  // Rank coin để kiểm tra
  COIN_RANK: {
    MIN_RANK: 20, // Top coin từ rank 20
    MAX_RANK: 100, // Đến rank 100
  },

  // Cấu hình market cap filter
  MARKET_CAP: {
    MAX_MARKET_CAP: 1e9, // Market cap tối đa 1B USD
    ENABLED: true, // Bật/tắt filter market cap
  },

  // Khung thời gian
  TIME_FRAME: "15m", // M15, M5, M30, H1, H4, D1...

  // Số lượng nến để tính trung bình
  CANDLE_COUNT_FOR_AVERAGE: 1000,

  // Ngưỡng tăng đột biến
  VOLUME_SPIKE_MULTIPLIER: 10, // Gấp 10 lần

  // Thời gian cache
  CACHE_DURATION_HOURS: 4, // Cache 4 giờ

  // Tần suất chạy
  SCHEDULER_INTERVAL_MINUTES: 15, // Mỗi 15 phút
};
```

## 📊 Chỉ báo kỹ thuật được phân tích

### EMA (Exponential Moving Average)

- **EMA 34**: Xu hướng ngắn hạn
- **EMA 89**: Xu hướng dài hạn
- **Gold Cross**: EMA34 cắt trên EMA89

### RSI (Relative Strength Index)

- **RSI 14**: Momentum oscillator
- **Overbought**: ≥ 70
- **Oversold**: ≤ 30

### MACD (Moving Average Convergence Divergence)

- **MACD Line**: Đường chính
- **Signal Line**: Đường tín hiệu
- **Histogram**: Sự khác biệt

### Volume Analysis

- **Volume Spike**: So sánh với trung bình 20 nến
- **Volume Confirmation**: Xác nhận xu hướng

### Support/Resistance

- **Support**: Mức hỗ trợ từ 50 nến gần nhất
- **Resistance**: Mức kháng cự từ 50 nến gần nhất

## 🎯 Kết quả phân tích AI

Mỗi phân tích bao gồm:

1. **Đánh giá xu hướng** (Tăng/Giảm/Đi ngang)
2. **Đề xuất giao dịch**:
   - **Long Entry**: Vùng vào lệnh mua
   - **Short Entry**: Vùng vào lệnh bán
   - **Take Profit**: Mục tiêu chốt lời
   - **Stop Loss**: Điểm dừng lỗ
3. **Đánh giá rủi ro** cho mỗi phương án
4. **Điểm tin cậy** (1-10) cho phân tích

## 🔄 Cách hoạt động

### Volume Monitor

1. **Lấy danh sách coins**: Top coins rank 20-100 từ Binance
2. **Filter market cap**: Chỉ giữ lại coins có market cap ≤ 1B USD
3. **Kiểm tra từng coin**:
   - Lấy 1000 nến M15 gần nhất
   - Tính trung bình khối lượng của 999 nến đầu
   - So sánh với nến cuối cùng
4. **Phát hiện spike**: Nếu volume nến cuối >= 10x trung bình
5. **Kiểm tra cache**: Bỏ qua nếu đã báo trong 4 giờ qua
6. **Gửi thông báo**: Gửi qua Telegram với thông tin chi tiết

### AI Analysis

1. **Thu thập dữ liệu**: Lấy 200 nến OHLCV từ Binance
2. **Tính toán chỉ báo**: EMA, RSI, MACD, Volume, S/R
3. **Phân tích kỹ thuật**: Diễn giải các chỉ báo
4. **AI Analysis**: Gửi đến Gemini AI để phân tích
5. **Kết quả**: Trả về phân tích chi tiết và đề xuất giao dịch

## 🚨 Thông báo Telegram

### Volume Spike Alert

```
🚨 VOLUME SPIKE DETECTED 🚨

📈 Coin: BTCUSDT
💰 Giá hiện tại: $45,250.00
📊 Khối lượng hiện tại: 1.25M
🔥 Tăng: 350.50% (3.50x)
⏰ Thời gian: 14:30:25 13/10/2025

⚙️ Cấu hình:
• Rank: 20-100
• Market cap: ≤ 1.00B
• Khung thời gian: 15m
• Ngưỡng: 10x
• Nến tính trung bình: 1000
```

### AI Analysis Result

```
📊 PHÂN TÍCH BTC/USDT - 4H 📊

👤 Phân tích cho: username
⏰ Thời gian: 14:30:25 13/10/2025

💰 Giá hiện tại: $45,250.00
📈 EMA: Giá đang nằm trên cả EMA34 và EMA89...
📊 RSI: Đang ở mức 68.50, vùng trung lập...
🔄 MACD: Đường MACD đang cắt lên trên đường Signal...
📦 Volume: Volume hiện tại cao hơn 25% so với trung bình...
🎯 Support: $44,500.00
🎯 Resistance: $46,000.00

🤖 PHÂN TÍCH AI:
[Phân tích chi tiết từ Gemini AI...]
```

## 🛠️ Troubleshooting

### Telegram Bot không hoạt động

- Kiểm tra Bot Token và Chat ID trong `.env.local`
- Test kết nối: `curl -X GET http://localhost:3010/api/telegram-bot/test`

### Gemini AI không hoạt động

- Kiểm tra API key trong `.env.local`
- Test kết nối: `curl -X GET http://localhost:3010/api/telegram-bot/test`

### Volume Monitor không phát hiện spikes

- Kiểm tra cấu hình trong `volumeMonitorConfig.js`
- Giảm `VOLUME_SPIKE_MULTIPLIER` để nhạy hơn
- Kiểm tra log console để xem chi tiết

### Server không khởi động

- Kiểm tra port 3010 có bị chiếm không
- Kiểm tra file `.env.local` có tồn tại không
- Chạy `npm install` để cài đặt dependencies

## 📝 Scripts có sẵn

```bash
# Chạy server đầy đủ
npm start

# Development mode
npm run dev

# Chỉ chạy Volume Monitor
npm run volume-monitor

# Test Telegram Bot
npm run test-telegram-bot

# Test AI Analyzer
npm run test-ai-analyzer
```

## ⚠️ Lưu ý quan trọng

- **Phân tích chỉ mang tính chất tham khảo**, không phải lời khuyên đầu tư
- **Luôn quản lý rủi ro** khi giao dịch cryptocurrency
- **Test kỹ lưỡng** trước khi sử dụng trong môi trường production
- **Theo dõi logs** để phát hiện lỗi sớm
- **Backup dữ liệu** quan trọng thường xuyên

## 🔗 Liên kết hữu ích

- [Binance API Documentation](https://binance-docs.github.io/apidocs/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Gemini AI](https://ai.google.dev/)
- [CCXT Documentation](https://ccxt.readthedocs.io/)
- [Technical Indicators](https://github.com/anandanand84/technicalindicators)

---

**Phát triển bởi**: Minh Ngo  
**Phiên bản**: 2.0.0  
**Cập nhật**: 13/10/2025
