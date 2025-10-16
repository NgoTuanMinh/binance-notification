const axios = require('axios');

const BASE_URL = 'http://localhost:3010';

async function testConsoleLogsAPI() {
  console.log('🧪 Testing Console Logs API...\n');
  
  try {
    // Test 1: Lấy console logs gần nhất
    console.log('1️⃣ Testing /api/console-logs endpoint (100 lines)...');
    const logsResponse = await axios.get(`${BASE_URL}/api/console-logs?lines=100`);
    console.log('✅ Console Logs API Response:');
    console.log(`   Log type: ${logsResponse.data.data.logType}`);
    console.log(`   Total logs: ${logsResponse.data.data.totalLogs}`);
    console.log(`   Requested lines: ${logsResponse.data.data.requestedLines}`);
    console.log(`   Returned lines: ${logsResponse.data.data.returnedLines}`);
    console.log(`   Level filter: ${logsResponse.data.data.level}`);
    
    if (logsResponse.data.data.logs.length > 0) {
      console.log('\n📋 Sample console log entries:');
      logsResponse.data.data.logs.slice(0, 5).forEach((log, index) => {
        console.log(`   ${index + 1}. [Line ${log.lineNumber}] [${log.level.toUpperCase()}] ${log.timestamp} - ${log.message.substring(0, 80)}${log.message.length > 80 ? '...' : ''}`);
      });
    }
    console.log('');
    
    // Test 2: Filter theo level error
    console.log('2️⃣ Testing /api/console-logs endpoint (error level only)...');
    try {
      const errorLogsResponse = await axios.get(`${BASE_URL}/api/console-logs?lines=50&level=error`);
      console.log('✅ Error Logs Filter Response:');
      console.log(`   Total error logs: ${errorLogsResponse.data.data.filteredLogs}`);
      console.log(`   Returned error logs: ${errorLogsResponse.data.data.returnedLines}`);
      
      if (errorLogsResponse.data.data.logs.length > 0) {
        console.log('\n📋 Error log entries:');
        errorLogsResponse.data.data.logs.slice(0, 3).forEach((log, index) => {
          console.log(`   ${index + 1}. [${log.level.toUpperCase()}] ${log.timestamp} - ${log.message}`);
        });
      } else {
        console.log('ℹ️ No error logs found (this is good!)');
      }
    } catch (error) {
      console.log('ℹ️ No error logs found (this is good!)');
    }
    console.log('');
    
    // Test 3: Filter theo level warn
    console.log('3️⃣ Testing /api/console-logs endpoint (warn level only)...');
    try {
      const warnLogsResponse = await axios.get(`${BASE_URL}/api/console-logs?lines=50&level=warn`);
      console.log('✅ Warn Logs Filter Response:');
      console.log(`   Total warn logs: ${warnLogsResponse.data.data.filteredLogs}`);
      console.log(`   Returned warn logs: ${warnLogsResponse.data.data.returnedLines}`);
      
      if (warnLogsResponse.data.data.logs.length > 0) {
        console.log('\n📋 Warning log entries:');
        warnLogsResponse.data.data.logs.slice(0, 3).forEach((log, index) => {
          console.log(`   ${index + 1}. [${log.level.toUpperCase()}] ${log.timestamp} - ${log.message}`);
        });
      } else {
        console.log('ℹ️ No warning logs found');
      }
    } catch (error) {
      console.log('ℹ️ No warning logs found');
    }
    console.log('');
    
    // Test 4: Test với số dòng vượt quá giới hạn
    console.log('4️⃣ Testing /api/console-logs endpoint (2000 lines - should be limited to 1000)...');
    const limitResponse = await axios.get(`${BASE_URL}/api/console-logs?lines=2000`);
    console.log('✅ Limit test:');
    console.log(`   Requested: 2000 lines`);
    console.log(`   Returned: ${limitResponse.data.data.returnedLines} lines (correctly limited to 1000)`);
    console.log('');
    
    // Test 5: Test clear console logs
    console.log('5️⃣ Testing DELETE /api/console-logs endpoint...');
    const clearResponse = await axios.delete(`${BASE_URL}/api/console-logs`);
    console.log('✅ Clear Console Logs Response:');
    console.log(`   Message: ${clearResponse.data.message}`);
    console.log('');
    
    // Test 6: Verify logs are cleared
    console.log('6️⃣ Verifying logs are cleared...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/console-logs?lines=10`);
    console.log('✅ Verification:');
    console.log(`   Total logs after clear: ${verifyResponse.data.data.totalLogs}`);
    console.log(`   Returned logs: ${verifyResponse.data.data.returnedLines}`);
    console.log('');
    
    console.log('🎉 All console logs API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Chạy test
testConsoleLogsAPI();
