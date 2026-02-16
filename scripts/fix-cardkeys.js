#!/usr/bin/env node

/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

/**
 * 卡密数据修复工具
 *
 * 用于修复 Redis 中不一致的卡密数据:
 * 1. 找出用户绑定但找不到对应卡密数据的情况
 * 2. 为这些用户创建临时的卡密信息 (使用户可以继续使用系统)
 * 3. 生成修复报告
 */

const { createClient } = require('@upstash/redis');

async function fixCardKeys() {
  console.log('=== 卡密数据修复工具 ===\n');

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
    // 1. 获取所有卡密数据
    console.log('--- 步骤 1: 获取所有卡密数据 ---');
    const cardKeyPattern = 'cardkey:hash:*';
    let cursor = '0';
    const cardKeyKeys = [];

    do {
      const result = await redis.scan(cursor, {
        match: cardKeyPattern,
        count: 100,
      });
      cursor = result.cursor;
      cardKeyKeys.push(...result.keys);
    } while (cursor !== '0');

    console.log(`找到 ${cardKeyKeys.length} 个卡密数据`);

    const cardKeyMap = new Map();
    for (const key of cardKeyKeys) {
      const data = await redis.get(key);
      if (data) {
        cardKeyMap.set(data.keyHash, data);
      }
    }
    console.log(`构建卡密映射表,共 ${cardKeyMap.size} 条记录\n`);

    // 2. 获取所有用户卡密绑定信息
    console.log('--- 步骤 2: 获取所有用户卡密绑定信息 ---');
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

    console.log(`找到 ${userKeys.length} 个用户卡密信息\n`);

    // 3. 检查数据一致性
    console.log('--- 步骤 3: 检查数据一致性 ---');
    const inconsistentUsers = [];

    for (const key of userKeys) {
      const userData = await redis.get(key);
      if (!userData || !userData.boundKey) {
        continue;
      }

      const username = key.replace('cardkey:user:', '');
      const boundKey = userData.boundKey;

      if (!cardKeyMap.has(boundKey)) {
        console.log(
          `✗ 用户 ${username} 的卡密数据丢失 (boundKey: ${boundKey})`,
        );
        inconsistentUsers.push({
          username,
          key,
          userData,
          boundKey,
        });
      }
    }

    console.log(`\n发现 ${inconsistentUsers.length} 个用户存在数据不一致\n`);

    if (inconsistentUsers.length === 0) {
      console.log('✓ 所有数据一致,无需修复');
      return;
    }

    // 4. 询问是否修复
    console.log('--- 步骤 4: 修复选项 ---');
    console.log('可用的修复选项:');
    console.log('1. 为丢失卡密的用户创建临时卡密数据 (推荐)');
    console.log('2. 只生成修复报告,不实际修改数据');
    console.log('3. 取消操作');

    // 简单实现: 默认执行选项 1
    console.log('\n默认执行选项 1: 为丢失卡密的用户创建临时卡密数据\n');

    // 5. 执行修复
    console.log('--- 步骤 5: 执行修复 ---');
    const fixedUsers = [];

    for (const { username, key, userData, boundKey } of inconsistentUsers) {
      // 创建临时卡密数据
      const tempCardKey = {
        key: `TEMP_${boundKey.substring(0, 8)}`, // 临时明文卡密
        keyHash: boundKey, // 使用现有的 hash
        keyType: 'month', // 默认类型
        status: 'used', // 标记为已使用
        createdAt: userData.boundAt || Date.now(),
        expiresAt: userData.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000, // 默认30天
        boundTo: username,
        boundAt: userData.boundAt || Date.now(),
      };

      // 保存到 Redis
      await redis.set(`cardkey:hash:${boundKey}`, JSON.stringify(tempCardKey));
      console.log(`✓ 为用户 ${username} 创建临时卡密数据`);

      // 更新状态集合
      await redis.sadd('cardkey:status:used', boundKey);
      console.log(`✓ 更新卡密状态集合\n`);

      fixedUsers.push({
        username,
        boundKey,
        tempCardKey,
      });
    }

    // 6. 生成修复报告
    console.log('--- 步骤 6: 修复报告 ---');
    console.log(`\n修复完成! 共修复 ${fixedUsers.length} 个用户\n`);

    console.log('详细修复信息:');
    for (const { username, boundKey, tempCardKey } of fixedUsers) {
      console.log(`\n用户: ${username}`);
      console.log(`  boundKey: ${boundKey}`);
      console.log(`  临时卡密: ${tempCardKey.key}`);
      console.log(
        `  过期时间: ${new Date(tempCardKey.expiresAt).toLocaleString('zh-CN')}`,
      );
      console.log(`  状态: ${tempCardKey.status}`);
    }

    console.log('\n注意事项:');
    console.log('- 临时卡密的明文格式为 TEMP_xxxxxxxx,仅用于标识');
    console.log('- 这些临时卡密不会影响用户的正常使用');
    console.log('- 建议联系这些用户,使用正规卡密重新绑定');
    console.log('- 临时卡密在用户重新绑定后会被自动替换');

    console.log('\n=== 修复完成 ===');
  } catch (error) {
    console.error('\n修复过程中出错:', error);
    process.exit(1);
  } finally {
    redis.quit();
  }
}

// 如果是直接运行此脚本
if (require.main === module) {
  fixCardKeys();
}

module.exports = { fixCardKeys };
