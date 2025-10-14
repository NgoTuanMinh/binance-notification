#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');

async function listAvailableModels() {
  try {
    const ai = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    
    console.log('🔍 Đang kiểm tra các model có sẵn...');
    
    // Test một số model phổ biến trực tiếp
    console.log('🧪 Testing các model phổ biến...');
    
    const testModels = [
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-002', 
      'gemini-1.5-pro-001',
      'gemini-1.5-flash-001',
      'gemini-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-8b',
      'gemini-1.0-pro'
    ];
    
    const workingModels = [];
    
    for (const modelName of testModels) {
      try {
        console.log(`\n🔬 Testing ${modelName}...`);
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Test connection');
        const response = await result.response;
        const text = response.text();
        console.log(`✅ ${modelName}: Hoạt động`);
        workingModels.push(modelName);
      } catch (error) {
        console.log(`❌ ${modelName}: ${error.message}`);
      }
    }
    
    console.log('\n📋 Tóm tắt:');
    console.log('============');
    if (workingModels.length > 0) {
      console.log('✅ Models hoạt động:');
      workingModels.forEach(model => console.log(`   - ${model}`));
      
      console.log('\n💡 Khuyến nghị sử dụng:');
      console.log(`   - Model tốt nhất: ${workingModels[0]}`);
      console.log(`   - Cập nhật cryptoAnalyzer.js với model: '${workingModels[0]}'`);
    } else {
      console.log('❌ Không có model nào hoạt động');
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    
    if (error.message.includes('API key not valid')) {
      console.log('\n💡 Hướng dẫn:');
      console.log('1. Truy cập: https://makersuite.google.com/app/apikey');
      console.log('2. Tạo API key mới');
      console.log('3. Cập nhật GEMINI_API_KEY trong .env.local');
    }
  }
}

// Run if called directly
if (require.main === module) {
  listAvailableModels().catch(console.error);
}

module.exports = { listAvailableModels };