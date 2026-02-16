#!/usr/bin/env node

const http = require('http');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(body),
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body,
            });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testCardKeyValidation() {
  console.log('=== 卡密功能验证测试 ===\n');

  let cookie = '';

  // 1. 登录管理员账户
  console.log('1. 登录管理员账户...');
  const loginRes = await makeRequest(
    {
      path: '/api/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { username: 'admin', password: '123456' },
  );
  console.log('   状态码:', loginRes.statusCode);
  if (loginRes.statusCode === 200) {
    console.log('   ✓ 登录成功');
    const setCookie = loginRes.headers['set-cookie'];
    if (setCookie) {
      cookie = setCookie[0].split(';')[0];
    }
  } else {
    console.log('   ✗ 登录失败:', loginRes.body);
    return;
  }

  // 2. 创建测试卡密
  console.log('\n2. 创建测试卡密...');
  const createCardKeyRes = await makeRequest(
    {
      path: '/api/admin/cardkey',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
    },
    { action: 'create', type: 'week', count: 1 },
  );
  console.log('   状态码:', createCardKeyRes.statusCode);
  if (createCardKeyRes.statusCode === 200 && createCardKeyRes.body.ok) {
    console.log('   ✓ 卡密创建成功');
    const testCardKey = createCardKeyRes.body.result.keys[0];
    console.log('   测试卡密:', testCardKey);

    // 3. 测试注册时使用有效卡密
    console.log('\n3. 测试注册时使用有效卡密...');
    const timestamp = Date.now();
    const validRegisterRes = await makeRequest(
      {
        path: '/api/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: `testuser_${timestamp}`,
        password: '123456',
        confirmPassword: '123456',
        cardKey: testCardKey,
      },
    );
    console.log('   状态码:', validRegisterRes.statusCode);
    if (validRegisterRes.statusCode === 200) {
      console.log('   ✓ 使用有效卡密注册成功');
    } else {
      console.log('   ✗ 注册失败:', validRegisterRes.body);
    }

    // 4. 测试注册时使用无效卡密（空卡密）
    console.log('\n4. 测试注册时使用空卡密...');
    const emptyCardKeyRes = await makeRequest(
      {
        path: '/api/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: `testuser_empty_${timestamp}`,
        password: '123456',
        confirmPassword: '123456',
        cardKey: '',
      },
    );
    console.log('   状态码:', emptyCardKeyRes.statusCode);
    if (emptyCardKeyRes.statusCode === 400) {
      console.log('   ✓ 正确拒绝空卡密:', emptyCardKeyRes.body.error);
    } else {
      console.log('   ✗ 未正确验证空卡密');
    }

    // 5. 测试注册时使用无效卡密（任意字符串）
    console.log('\n5. 测试注册时使用无效卡密（任意字符串）...');
    const invalidCardKeyRes = await makeRequest(
      {
        path: '/api/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: `testuser_invalid_${timestamp}`,
        password: '123456',
        confirmPassword: '123456',
        cardKey: 'invalid_card_key_12345',
      },
    );
    console.log('   状态码:', invalidCardKeyRes.statusCode);
    if (
      invalidCardKeyRes.statusCode === 500 ||
      invalidCardKeyRes.statusCode === 400
    ) {
      console.log('   ✓ 正确拒绝无效卡密:', invalidCardKeyRes.body.error);
    } else {
      console.log('   ✗ 未正确验证无效卡密');
    }

    // 6. 测试重复使用同一卡密
    console.log('\n6. 测试重复使用同一卡密...');
    const reuseCardKeyRes = await makeRequest(
      {
        path: '/api/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: `testuser_reuse_${timestamp}`,
        password: '123456',
        confirmPassword: '123456',
        cardKey: testCardKey,
      },
    );
    console.log('   状态码:', reuseCardKeyRes.statusCode);
    if (
      reuseCardKeyRes.statusCode === 500 ||
      reuseCardKeyRes.statusCode === 400
    ) {
      console.log('   ✓ 正确拒绝重复使用卡密:', reuseCardKeyRes.body.error);
    } else {
      console.log('   ✗ 未正确防止卡密重复使用');
    }
  } else {
    console.log('   ✗ 卡密创建失败:', createCardKeyRes.body);
  }

  console.log('\n=== 测试完成 ===');
}

testCardKeyValidation().catch(console.error);
