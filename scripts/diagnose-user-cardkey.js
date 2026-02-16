#!/usr/bin/env node

/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

/**
 * 快速卡密诊断工具
 *
 * 用于快速检查指定用户的卡密状态
 */

const { createClient } = require('@upstash/redis');

async function diagnoseUser(username) {
  if (!username) {
    console.error('错误: 请提供用户名');
    console.log('使用方法: node scripts/diagnose-user-cardkey.js <username>');
    process.exit(1);
  }

  console.log(`=== 卡密诊断工具 - 用户: ${username} ===\n`);

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
    // 1. 检查用户卡密绑定信息
    console.log('--- 1. 用户卡密绑定信息 ---');
    const userKey = `cardkey:user:${username}`;
    const userData = await redis.get(userKey);

    if (!userData) {
      console.log(`✗ 用户 ${username} 没有卡密绑定信息`);
      console.log('\n可能的原因:');
      console.log('- 用户从未绑定过卡密');
      console.log('- 用户卡密信息被删除\n');
      console.log('建议: 让用户重新绑定卡密');
      return;
    }

    console.log(`✓ 找到用户卡密绑定信息:`);
    console.log(JSON.stringify(userData, null, 2));

    const boundKey = userData.boundKey;
    console.log(`\n用户的 boundKey: ${boundKey}`);

    // 2. 检查对应的卡密数据
    console.log('\n--- 2. 对应的卡密数据 ---');
    const cardKeyKey = `cardkey:hash:${boundKey}`;
    const cardKeyData = await redis.get(cardKeyKey);

    if (!cardKeyData) {
      console.log(`✗ 找不到对应的卡密数据 (key: ${cardKeyKey})`);
      console.log('\n问题: 用户的卡密绑定信息存在,但卡密数据丢失');
      console.log('\n可能的解决方案:');
      console.log('- 运行修复工具: node scripts/fix-cardkeys.js');
      console.log('- 让用户使用新卡密重新绑定');
      return;
    }

    console.log(`✓ 找到对应的卡密数据:`);
    console.log(JSON.stringify(cardKeyData, null, 2));

    // 3. 计算剩余天数
    console.log('\n--- 3. 卡密状态 ---');
    const now = Date.now();
    const expiresAt = userData.expiresAt;
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    const isExpired = expiresAt < now;
    const isExpiring = !isExpired && daysRemaining <= 30;

    console.log(`过期时间: ${new Date(expiresAt).toLocaleString('zh-CN')}`);
    console.log(`剩余天数: ${daysRemaining} 天`);
    console.log(
      `状态: ${isExpired ? '已过期' : isExpiring ? '即将过期' : '正常'}`,
    );

    // 4. 检查卡密状态集合
    console.log('\n--- 4. 卡密状态集合 ---');
    const statuses = ['unused', 'used', 'expired'];
    for (const status of statuses) {
      const statusKey = `cardkey:status:${status}`;
      const isMember = await redis.sismember(statusKey, boundKey);
      if (isMember) {
        console.log(`✓ 卡密在 "${status}" 状态集合中`);
      }
    }

    // 5. 结论
    console.log('\n--- 5. 诊断结论 ---');
    console.log('✓ 用户卡密数据完整,应该可以正常显示');
    console.log('\n如果前端仍然不显示卡密信息,请检查:');
    console.log(
      '- API 路由日志: tail -f logs/your-log-file.log | grep "getFullUserCardKey"',
    );
    console.log('- 前端控制台错误');
    console.log('- 网络请求是否成功');

    console.log('\n=== 诊断完成 ===');
  } catch (error) {
    console.error('\n诊断过程中出错:', error);
    process.exit(1);
  } finally {
    redis.quit();
  }
}

// 获取命令行参数
const username = process.argv[2];
diagnoseUser(username);
