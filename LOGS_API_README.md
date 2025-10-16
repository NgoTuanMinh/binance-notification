# Console Logs API Documentation

API để đọc và quản lý console logs của server Binance Coin Tracker.

## Endpoints

### Console Logs (Real-time)

#### 1. Đọc console logs

```
GET /api/console-logs?lines=1000&level=log
```

**Parameters:**

- `lines` (optional): Số dòng log cần đọc (mặc định: 1000, tối đa: 1000)
- `level` (optional): Level log để filter (log, error, warn, hoặc bỏ trống để lấy tất cả)

**Response:**

```json
{
  "success": true,
  "data": {
    "logType": "console",
    "totalLogs": 1500,
    "filteredLogs": 1200,
    "requestedLines": 1000,
    "returnedLines": 1000,
    "level": "log",
    "logs": [
      {
        "lineNumber": 201,
        "timestamp": "2024-01-15T10:30:15.123Z",
        "level": "log",
        "message": "Server started successfully",
        "fullLine": "[2024-01-15T10:30:15.123Z] [LOG] Server started successfully"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:17.000Z"
}
```

#### 2. Xóa console logs

```
DELETE /api/console-logs
```

**Response:**

```json
{
  "success": true,
  "message": "Cleared 1500 console log entries",
  "timestamp": "2024-01-15T10:30:17.000Z"
}
```

## Cách sử dụng

### 1. Kiểm tra console logs gần nhất

```bash
curl "http://localhost:3010/api/console-logs?lines=100"
```

### 2. Đọc chỉ error logs từ console

```bash
curl "http://localhost:3010/api/console-logs?level=error&lines=50"
```

### 3. Đọc chỉ warning logs từ console

```bash
curl "http://localhost:3010/api/console-logs?level=warn&lines=50"
```

### 4. Xóa tất cả console logs

```bash
curl -X DELETE "http://localhost:3010/api/console-logs"
```

## Test API

Chạy test để kiểm tra API hoạt động:

```bash
npm run test-console-logs-api
```

## Tính năng

### Console Log Capture System

- ✅ **Real-time capture**: Tự động capture tất cả console.log, console.error, console.warn
- ✅ **Memory management**: Giữ tối đa 1000 dòng log gần nhất
- ✅ **Level filtering**: Filter theo log level (log, error, warn)
- ✅ **Timestamp**: Mỗi log có timestamp chính xác
- ✅ **Clear function**: Có thể xóa logs để giải phóng memory

### Log Levels

- `log`: Thông tin thường
- `error`: Lỗi
- `warn`: Cảnh báo

## Lưu ý

1. API giới hạn tối đa 1000 dòng log mỗi lần request để tránh quá tải
2. Logs được lưu trong memory, sẽ mất khi restart server
3. Timestamp được tạo tự động khi capture log
4. Logs được sắp xếp từ cũ đến mới (dòng cuối cùng là log gần nhất)
5. Có thể xóa logs để giải phóng memory khi cần thiết
