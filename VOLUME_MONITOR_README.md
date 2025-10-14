# Binance Volume Monitor

Hệ thống tự động kiểm tra khối lượng giao dịch đột biến trên Binance và gửi thông báo qua Telegram.

## Tính năng

- 🔍 **Kiểm tra tự động**: Chạy mỗi 15 phút để kiểm tra volume spikes
- 📊 **Top coins**: Theo dõi coins rank 20-100 theo market cap
- 💰 **Market cap filter**: Chỉ theo dõi coins có market cap ≤ 1B USD
- 📈 **Khung M15**: Sử dụng dữ liệu nến 15 phút
- 🚨 **Cảnh báo thông minh**: Chỉ báo khi volume tăng gấp 10 lần trung bình 1000 nến
- 💾 **Cache thông minh**: Tránh báo trùng trong 4 giờ
- 📱 **Telegram**: Gửi thông báo chi tiết qua Telegram bot
- ⚙️ **Cấu hình linh hoạt**: Dễ dàng thay đổi các thông số

## Cài đặt

1. **Clone repository và cài đặt dependencies:**

```bash
npm install
```

2. **Tạo file `.env.local`:**

```bash
cp env.example .env.local
```

3. **Cấu hình Telegram Bot:**

   - Tạo bot mới với [@BotFather](https://t.me/BotFather)
   - Lấy Bot Token và điền vào `TELEGRAM_BOT_TOKEN`
   - Lấy Chat ID và điền vào `TELEGRAM_CHAT_ID`

4. **Chạy ứng dụng:**

**Chạy server đầy đủ (bao gồm API endpoints):**

```bash
npm start
```

**Chỉ chạy Volume Monitor:**

```bash
npm run volume-monitor
```

**Chạy development mode:**

```bash
npm run dev
```

## Cấu hình

Tất cả cấu hình có thể thay đổi trong file `volumeMonitorConfig.js`:

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

## API Endpoints

### Volume Monitor API

- `GET /api/volume-monitor/status` - Xem trạng thái scheduler
- `POST /api/volume-monitor/start` - Bắt đầu scheduler
- `POST /api/volume-monitor/stop` - Dừng scheduler
- `POST /api/volume-monitor/restart` - Khởi động lại scheduler
- `GET /api/volume-monitor/cache` - Xem thông tin cache
- `DELETE /api/volume-monitor/cache` - Xóa cache
- `POST /api/volume-monitor/test` - Test kết nối
- `POST /api/volume-monitor/run-once` - Chạy kiểm tra 1 lần

### Ví dụ sử dụng API

**Xem trạng thái:**

```bash
curl http://localhost:3010/api/volume-monitor/status
```

**Chạy kiểm tra 1 lần:**

```bash
curl -X POST http://localhost:3010/api/volume-monitor/run-once
```

**Dừng scheduler:**

```bash
curl -X POST http://localhost:3010/api/volume-monitor/stop
```

## Cách hoạt động

1. **Lấy danh sách coins**: Lấy top coins rank 20-100 từ Binance
2. **Filter market cap**: Chỉ giữ lại coins có market cap ≤ 1B USD
3. **Kiểm tra từng coin**:
   - Lấy 1000 nến M15 gần nhất
   - Tính trung bình khối lượng của 999 nến đầu
   - So sánh với nến cuối cùng
4. **Phát hiện spike**: Nếu volume nến cuối >= 10x trung bình
5. **Kiểm tra cache**: Bỏ qua nếu đã báo trong 4 giờ qua
6. **Gửi thông báo**: Gửi qua Telegram với thông tin chi tiết

## Thông báo Telegram

Khi phát hiện volume spike, bot sẽ gửi thông báo với:

- 📈 Tên coin và giá hiện tại
- 📊 Khối lượng hiện tại vs trung bình
- 🔥 Phần trăm tăng và hệ số nhân
- ⏰ Thời gian phát hiện
- ⚙️ Cấu hình hiện tại (bao gồm market cap filter)
- 🔗 Link Binance trading

## Troubleshooting

### Telegram không hoạt động

- Kiểm tra Bot Token và Chat ID trong `.env.local`
- Test kết nối: `curl -X POST http://localhost:3010/api/volume-monitor/test`

### Không phát hiện volume spike

- Kiểm tra cấu hình trong `volumeMonitorConfig.js`
- Giảm `VOLUME_SPIKE_MULTIPLIER` để nhạy hơn
- Kiểm tra log console để xem chi tiết

### Server không khởi động

- Kiểm tra port 3010 có bị chiếm không
- Kiểm tra file `.env.local` có tồn tại không
- Chạy `npm install` để cài đặt dependencies

## Logs

Server sẽ hiển thị logs chi tiết:

- 🔍 Quá trình kiểm tra coins
- 🚨 Volume spikes được phát hiện
- ✅ Thông báo gửi thành công
- ❌ Lỗi và cảnh báo

## Lưu ý

- Hệ thống sử dụng Binance API công khai, có rate limit
- Cache được lưu trong memory, sẽ mất khi restart server
- Thông báo Telegram có thể bị delay tùy thuộc vào mạng
- Khuyến nghị chạy trên server 24/7 để theo dõi liên tục
