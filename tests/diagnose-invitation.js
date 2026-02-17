#!/usr/bin/env node

/**
 * 邀请积分功能诊断工具
 *
 * 使用方法：
 * 1. 确保服务器正在运行 (npm run dev)
 * 2. 运行此脚本: node tests/diagnose-invitation.js
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70) + '\n');
}

async function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function diagnose() {
  logSection('🔍 邀请积分功能诊断工具');
  log(`服务器地址: ${BASE_URL}`, 'cyan');
  log(`诊断时间: ${new Date().toLocaleString('zh-CN')}`, 'cyan');

  // 1. 检查邀请信息API
  log('1️⃣  检查邀请信息API', 'blue');
  try {
    const inviteInfo = await request('GET', '/api/invitation/info');
    if (inviteInfo.status === 200) {
      log('✅ 邀请信息API正常', 'green');
      log(`   邀请码: ${inviteInfo.data?.code || '未生成'}`, 'cyan');
      log(`   邀请人数: ${inviteInfo.data?.totalInvites || 0}`, 'cyan');
      log(`   累计奖励: ${inviteInfo.data?.totalRewards || 0}`, 'cyan');
      log(`   当前积分: ${inviteInfo.data?.balance || 0}`, 'cyan');
    } else {
      log('❌ 邀请信息API异常', 'red');
      log(`   状态码: ${inviteInfo.status}`, 'red');
      log(`   响应: ${JSON.stringify(inviteeInfo.data)}`, 'red');
    }
  } catch (error) {
    log('❌ 邀请信息API请求失败', 'red');
    log(`   错误: ${error.message}`, 'red');
  }

  // 2. 检查积分余额API
  log('\n2️⃣  检查积分余额API', 'blue');
  try {
    const balance = await request('GET', '/api/points/balance');
    if (balance.status === 200) {
      log('✅ 积分余额API正常', 'green');
      log(`   积分余额: ${balance.data?.balance || 0}`, 'cyan');
    } else {
      log('❌ 积分余额API异常', 'red');
      log(`   状态码: ${balance.status}`, 'red');
    }
  } catch (error) {
    log('❌ 积分余额API请求失败', 'red');
    log(`   错误: ${error.message}`, 'red');
  }

  // 3. 检查积分历史API
  log('\n3️⃣  检查积分历史API', 'blue');
  try {
    const history = await request('GET', '/api/points/history');
    if (history.status === 200) {
      log('✅ 积分历史API正常', 'green');
      const records = history.data || [];
      log(`   历史记录数: ${records.length}`, 'cyan');
      if (records.length > 0) {
        log(`   最近记录:`, 'cyan');
        records.slice(0, 3).forEach((record, index) => {
          log(
            `     ${index + 1}. ${record.reason || '未知'} (${record.amount > 0 ? '+' : ''}${record.amount}) - ${new Date(record.createdAt).toLocaleString('zh-CN')}`,
            'cyan',
          );
        });
      } else {
        log('   ⚠️  暂无积分记录', 'yellow');
      }
    } else {
      log('❌ 积分历史API异常', 'red');
      log(`   状态码: ${history.status}`, 'red');
    }
  } catch (error) {
    log('❌ 积分历史API请求失败', 'red');
    log(`   错误: ${error.message}`, 'red');
  }

  // 4. 测试邀请码验证（模拟）
  log('\n4️⃣  邀请码验证测试', 'blue');
  try {
    // 获取邀请码
    const inviteInfo = await request('GET', '/api/invitation/info');
    const code = inviteInfo.data?.code;

    if (code) {
      log(`   测试邀请码: ${code}`, 'cyan');
      log('   ⚠️  需要使用此邀请码注册新账号来验证', 'yellow');
      log('   建议运行: node tests/test-invitation-points.js', 'yellow');
    } else {
      log('   ⚠️  未生成邀请码', 'yellow');
      log('   请先访问"我的邀请"页面生成邀请码', 'yellow');
    }
  } catch (error) {
    log('❌ 邀请码验证测试失败', 'red');
    log(`   错误: ${error.message}`, 'red');
  }

  // 5. 检查卡密兑换API
  log('\n5️⃣  检查卡密兑换API', 'blue');
  try {
    const redeem = await request('POST', '/api/redeem/cardkey');
    if (redeem.status === 200) {
      log('✅ 卡密兑换API正常', 'green');
      log(`   兑换结果: ${redeem.data?.success ? '成功' : '失败'}`, 'cyan');
      if (!redeem.data?.success) {
        log(`   原因: ${redeem.data?.error || '未知'}`, 'cyan');
      }
    } else {
      log('❌ 卡密兑换API异常', 'red');
      log(`   状态码: ${redeem.status}`, 'red');
    }
  } catch (error) {
    log('❌ 卡密兑换API请求失败', 'red');
    log(`   错误: ${error.message}`, 'red');
  }

  // 6. 常见问题检查
  logSection('⚠️  常见问题检查');

  const issues = [];

  // 检查是否有邀请码
  const inviteInfo = await request('GET', '/api/invitation/info');
  if (!inviteInfo.data?.code) {
    issues.push('❌ 用户未生成邀请码（请访问"我的邀请"页面）');
  }

  // 检查是否有积分记录
  const balance = await request('GET', '/api/points/balance');
  if (balance.data?.balance === 0) {
    issues.push('⚠️  积分为0（可能从未邀请过好友）');
  }

  if (issues.length === 0) {
    log('✅ 未发现明显问题', 'green');
  } else {
    log('发现以下问题:', 'yellow');
    issues.forEach((issue) => log(`  ${issue}`, 'yellow'));
  }

  // 7. 建议和下一步
  logSection('💡 建议和下一步');
  log('如果邀请积分功能正常工作，应该看到以下内容:', 'cyan');
  log('1. ✅ 邀请信息API返回有效的邀请码', 'green');
  log('2. ✅ 积分历史中有"邀请好友注册"的记录', 'green');
  log('3. ✅ 邀请人数和累计奖励数字大于0', 'green');
  log('\n建议操作:', 'cyan');
  log('1. 运行完整测试: node tests/test-invitation-points.js', 'yellow');
  log('2. 查看服务器日志（关注"邀请"、"积分"关键词）', 'yellow');
  log('3. 检查后台管理中的邀请配置', 'yellow');
  log('4. 使用不同的IP地址测试（避免IP奖励限制）', 'yellow');
  log('\n如果问题依然存在，请提供以下信息:', 'yellow');
  log('- 服务器日志中的调试信息', 'yellow');
  log('- 测试脚本的输出结果', 'yellow');
  log('- 浏览器控制台的错误信息', 'yellow');

  logSection('🏁 诊断完成');
}

diagnose().catch((error) => {
  log(`诊断失败: ${error.message}`, 'red');
  process.exit(1);
});
