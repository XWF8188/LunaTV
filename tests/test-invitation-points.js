#!/usr/bin/env node

/**
 * 测试邀请积分功能
 *
 * 使用方法：
 * 1. 确保服务器正在运行 (npm run dev)
 * 2. 运行此脚本: node tests/test-invitation-points.js
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// 颜色输出
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
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

// 发送HTTP请求的辅助函数
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

// 清理测试用户
async function cleanupUser(username) {
  try {
    // 注意：这里需要管理员API来删除用户，暂时跳过
    log(`注意：用户 ${username} 需要手动清理`, 'yellow');
  } catch (error) {
    log(`清理用户失败: ${error.message}`, 'red');
  }
}

// 主测试流程
async function testInvitationPoints() {
  logSection('🧪 邀请积分功能测试');

  const timestamp = Date.now();
  const inviterUsername = `test_inviter_${timestamp}`;
  const inviteeUsername = `test_invitee_${timestamp}`;
  const testPassword = 'Test123456';

  try {
    // 第一步：注册邀请人
    log('📝 第一步：注册邀请人账号', 'blue');
    const inviterRegister = await request('/api/register', {
      username: inviterUsername,
      password: testPassword,
      confirmPassword: testPassword,
      cardKey: '', // 需要一个有效的卡密
    });

    if (inviterRegister.status !== 200) {
      log(`❌ 邀请人注册失败: ${JSON.stringify(inviterRegister.data)}`, 'red');
      log('\n提示：需要先在后台创建一个有效的卡密', 'yellow');
      return;
    }
    log(`✅ 邀请人注册成功: ${inviterUsername}`, 'green');

    // 保存邀请人的cookie
    const inviterCookie = inviterRegister.headers?.['set-cookie']?.[0];

    // 第二步：获取邀请人的邀请码
    log('📝 第二步：获取邀请人的邀请码', 'blue');
    const inviteInfo = await request('/api/invitation/info', null);
    log(`邀请信息: ${JSON.stringify(inviteInfo.data)}`, 'cyan');

    if (!inviteInfo.data || !inviteInfo.data.code) {
      log(`❌ 获取邀请码失败`, 'red');
      return;
    }
    const invitationCode = inviteInfo.data.code;
    log(`✅ 获取邀请码成功: ${invitationCode}`, 'green');

    // 第三步：检查邀请人初始积分
    log('📝 第三步：检查邀请人初始积分', 'blue');
    const initialBalance = inviteInfo.data.balance;
    const initialTotalEarned = inviteInfo.data.totalEarned;
    log(`初始积分: ${initialBalance}`, 'cyan');
    log(`累计奖励: ${initialTotalEarned}`, 'cyan');

    // 第四步：使用邀请码注册被邀请人
    log('📝 第四步：使用邀请码注册被邀请人', 'blue');
    const inviteeRegister = await request('/api/register', {
      username: inviteeUsername,
      password: testPassword,
      confirmPassword: testPassword,
      cardKey: '', // 需要一个有效的卡密
      invitationCode: invitationCode,
    });

    if (inviteeRegister.status !== 200) {
      log(
        `❌ 被邀请人注册失败: ${JSON.stringify(inviteeRegister.data)}`,
        'red',
      );
      return;
    }
    log(`✅ 被邀请人注册成功: ${inviteeUsername}`, 'green');

    // 第五步：等待一下让积分更新
    log('📝 第五步：等待积分更新...', 'blue');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 第六步：检查邀请人积分是否增加
    log('📝 第六步：检查邀请人积分变化', 'blue');
    const updatedInviteInfo = await request('/api/invitation/info', null);
    log(`更新后的邀请信息: ${JSON.stringify(updatedInviteInfo.data)}`, 'cyan');

    const updatedBalance = updatedInviteInfo.data.balance;
    const updatedTotalEarned = updatedInviteInfo.data.totalEarned;
    const rewardPoints = updatedBalance - initialBalance;

    log(`更新后积分: ${updatedBalance}`, 'cyan');
    log(`更新后累计奖励: ${updatedTotalEarned}`, 'cyan');
    log(`获得积分: ${rewardPoints}`, 'cyan');

    // 第七步：验证结果
    logSection('✅ 测试结果验证');

    if (rewardPoints > 0) {
      log(`🎉 测试成功！邀请人获得了 ${rewardPoints} 积分`, 'green');
      log(`\n积分明细:`, 'cyan');
      log(`  - 初始积分: ${initialBalance}`, 'cyan');
      log(`  - 最终积分: ${updatedBalance}`, 'cyan');
      log(`  - 奖励积分: ${rewardPoints}`, 'cyan');
    } else {
      log(`❌ 测试失败！邀请人没有获得积分`, 'red');
      log(`\n可能的原因:`, 'yellow');
      log(`  1. 邀请配置未启用（检查后台设置）`, 'yellow');
      log(`  2. IP已奖励过（尝试使用不同IP注册）`, 'yellow');
      log(`  3. 数据库连接问题`, 'yellow');
      log(`\n调试建议:`, 'yellow');
      log(`  - 查看服务器日志中的调试信息`, 'yellow');
      log(`  - 检查 Redis 数据库中的配置`, 'yellow');
    }

    // 清理提示
    logSection('🧹 清理测试数据');
    log(`请手动删除以下测试用户:`, 'yellow');
    log(`  - ${inviterUsername}`, 'yellow');
    log(`  - ${inviteeUsername}`, 'yellow');
    log(`\n可以使用后台管理界面删除，或者直接删除数据库记录`, 'yellow');
  } catch (error) {
    log(`\n❌ 测试过程中发生错误:`, 'red');
    log(error.message, 'red');
    log(error.stack, 'red');
  }
}

// 运行测试
logSection('🚀 开始测试邀请积分功能');
log(`服务器地址: ${BASE_URL}`, 'cyan');
log(`开始时间: ${new Date().toLocaleString('zh-CN')}`, 'cyan');

testInvitationPoints()
  .then(() => {
    logSection('🏁 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    log(`测试失败: ${error.message}`, 'red');
    process.exit(1);
  });
