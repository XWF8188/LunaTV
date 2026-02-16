#!/usr/bin/env node

/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

const { createClient } = require('@upstash/redis');

async function debugCardKeys() {
  console.log('=== 卡密调试工具 ===');

  // 检查环境变量
  const upstashUrl = process.env.UPSTASH_URL;
  const upstashToken = process.env.UPSTASH_TOKEN;

  if (!upstashUrl || !upstashToken) {
    console.error('错误: 缺少 UPSTASH_URL 或 UPSTASH_TOKEN 环境变量');
    process.exit(1);
  }

  console.log('连接到 Upstash Redis...');
  const redis = createClient({
    url: upstashUrl,
    token: upstashToken,
  });

  try {
    // 1. 获取所有卡密相关的键
    console.log('\n--- 1. 扫描所有卡密相关的键 ---');
    const pattern = 'cardkey:*';
    let cursor = '0';
    const allKeys = [];

    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result.cursor;
      allKeys.push(...result.keys);
    } while (cursor !== '0');

    console.log(`找到 ${allKeys.length} 个卡密相关的键:`);
    allKeys.forEach((key) => console.log(`  - ${key}`));

    // 2. 获取所有卡密数据
    console.log('\n--- 2. 获取所有卡密数据 ---');
    const cardKeyPattern = 'cardkey:hash:*';
    cursor = '0';
    const cardKeyKeys = [];

    do {
      const result = await redis.scan(cursor, {
        match: cardKeyPattern,
        count: 100,
      });
      cursor = result.cursor;
      cardKeyKeys.push(...result.keys);
    } while (cursor !== '0');

    console.log(`找到 ${cardKeyKeys.length} 个卡密数据:`);
    for (const key of cardKeyKeys) {
      const data = await redis.get(key);
      console.log(`\n  键: ${key}`);
      console.log(`  数据: ${JSON.stringify(data, null, 2)}`);
    }

    // 3. 获取用户卡密信息
    console.log('\n--- 3. 获取用户卡密信息 ---');
    const userPattern = 'cardkey:user:*';
    cursor = '0';
    const userKeys = [];

    do {
      const result = await redis.scan(cursor, {
        match: userPattern,
        count: 100,
      });
      cursor = result.cursor;
      userKeys.push(...result.keys);
    } while (cursor !== '0');

    console.log(`找到 ${userKeys.length} 个用户卡密信息:`);
    for (const key of userKeys) {
      const data = await redis.get(key);
      console.log(`\n  键: ${key}`);
      console.log(`  数据: ${JSON.stringify(data, null, 2)}`);

      // 检查 boundKey 是否存在于卡密数据中
      if (data && data.boundKey) {
        const boundKeyHash = data.boundKey;
        const cardKey = await redis.get(`cardkey:hash:${boundKeyHash}`);
        if (cardKey) {
          console.log(`  ✓ 对应的卡密数据存在`);
        } else {
          console.log(`  ✗ 错误: 对应的卡密数据不存在!`);
        }
      }
    }

    // 4. 获取状态集合
    console.log('\n--- 4. 检查卡密状态集合 ---');
    const statuses = ['unused', 'used', 'expired'];
    for (const status of statuses) {
      const statusKey = `cardkey:status:${status}`;
      const members = await redis.smembers(statusKey);
      console.log(`  ${status}: ${members.length} 个卡密`);
      if (members.length > 0 && members.length <= 5) {
        members.forEach((m) => console.log(`    - ${m}`));
      }
    }

    console.log('\n=== 调试完成 ===');
  } catch (error) {
    console.error('调试过程中出错:', error);
    process.exit(1);
  } finally {
    redis.quit();
  }
}

debugCardKeys();
