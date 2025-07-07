#!/usr/bin/env node

/**
 * Connectivity test script for debugging API issues
 * Run with: npm run test:connectivity
 */

import axios from 'axios';

const API_URL = process.env.VITE_API_URL || 'https://1treu6p055.execute-api.us-east-1.amazonaws.com/prod';

console.log('🔍 Testing API Connectivity...');
console.log('API URL:', API_URL);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Timestamp:', new Date().toISOString());
console.log('---');

async function testEndpoint(endpoint, method = 'GET', data = null) {
  const url = `${API_URL}${endpoint}`;
  const startTime = Date.now();
  
  try {
    console.log(`📤 Testing ${method} ${endpoint}...`);
    
    const config = {
      method,
      url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'VoiceInsight-ConnectivityTest/1.0'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${endpoint}: ${response.status} (${duration}ms)`);
    console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    
    return { success: true, status: response.status, duration, data: response.data };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.response) {
      console.log(`❌ ${endpoint}: ${error.response.status} (${duration}ms)`);
      console.log(`   Error: ${error.response.data?.detail || error.response.statusText}`);
      return { success: false, status: error.response.status, duration, error: error.response.data };
    } else if (error.request) {
      console.log(`❌ ${endpoint}: Network Error (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      return { success: false, status: 0, duration, error: error.message };
    } else {
      console.log(`❌ ${endpoint}: Request Error (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      return { success: false, status: 0, duration, error: error.message };
    }
  }
}

async function runTests() {
  const tests = [
    // Basic connectivity
    { endpoint: '/', method: 'GET' },
    { endpoint: '/health', method: 'GET' },
    
    // API endpoints
    { endpoint: '/api/supported-languages', method: 'GET' },
    { endpoint: '/api/supported-emotions', method: 'GET' },
    { endpoint: '/api/model-info', method: 'GET' },
    
    // Test CORS preflight
    { endpoint: '/api/process-audio', method: 'OPTIONS' },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.method, test.data);
    results.push({ ...test, ...result });
    
    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Test Summary:');
  console.log('---');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Success Rate: ${successful}/${total} (${Math.round(successful/total*100)}%)`);
  
  const avgLatency = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.duration, 0) / successful;
  
  if (successful > 0) {
    console.log(`Average Latency: ${Math.round(avgLatency)}ms`);
  }
  
  console.log('\nFailed Tests:');
  results
    .filter(r => !r.success)
    .forEach(r => {
      console.log(`  ❌ ${r.method} ${r.endpoint}: ${r.error}`);
    });
  
  console.log('\n🔧 Troubleshooting Tips:');
  
  if (results.some(r => r.status === 0)) {
    console.log('  • Network connectivity issues detected');
    console.log('  • Check internet connection');
    console.log('  • Verify API URL is correct');
  }
  
  if (results.some(r => r.status === 403)) {
    console.log('  • CORS or authentication issues detected');
    console.log('  • Check API Gateway CORS configuration');
    console.log('  • Verify request headers');
  }
  
  if (results.some(r => r.status >= 500)) {
    console.log('  • Server errors detected');
    console.log('  • Check Lambda function logs');
    console.log('  • Verify Lambda function is deployed');
  }
  
  if (results.some(r => r.duration > 10000)) {
    console.log('  • High latency detected (possible cold start)');
    console.log('  • Consider implementing retry logic');
    console.log('  • Monitor Lambda cold start metrics');
  }
  
  console.log('\n✅ Test completed!');
  
  // Exit with error code if any tests failed
  process.exit(successful === total ? 0 : 1);
}

runTests().catch(error => {
  console.error('🚨 Test runner failed:', error);
  process.exit(1);
});