#!/usr/bin/env node

/**
 * 检查邀请人积分记录中的邀请码
 *
 * 使用方法：
 * 1. 确保服务器正在运行 (npm run dev)
 * 2. 运行此脚本: node tests/check-inviter-code.js <邀请人用户名>
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const INVITER_USERNAME = process.argv[2] || 'testuser';

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

async function checkInviterCode(inviterUsername) {
  logSection('🔍 检查邀请人积分记录');

  log(`邀请人用户名: ${inviterUsername}`, 'cyan');
  log(`服务器地址: ${BASE_URL}`, 'cyan');

  try {
    // 1. 获取邀请人信息
    log('\n📝 第一步：获取邀请人信息', 'blue');
    const inviteInfo = await request('GET', '/api/invitation/info');
    log(`邀请信息: ${JSON.stringify(inviteInfo.data, null, 2)}`, 'cyan');

    if (!inviteInfo.data) {
      log('❌ 无法获取邀请人信息', 'red');
      return;
    }

    const { code, balance, totalEarned, totalInvites } = inviteInfo.data;

    log(`\n📊 邀请人状态:`, 'blue');
    log(`  邀请码: ${code || '未生成'}`, code ? 'green' : 'red');
    log(`  当前积分: ${balance}`, 'cyan');
    log(`  累计奖励: ${totalEarned}`, 'cyan');
    log(`  邀请人数: ${totalInvites}`, 'cyan');

    // 2. 检查邀请码是否存在
    logSection('✅ 邀请码检查结果');

    if (!code || code === '') {
      log('❌ 邀请人没有生成邀请码', 'red');
      log('\n🔧 解决方案:', 'yellow');
      log('1. 让邀请人登录系统', 'yellow');
      log('2. 访问"我的邀请"页面', 'yellow');
      log('3. 系统会自动生成邀请码', 'yellow');
      log('4. 使用生成的邀请码注册新账号', 'yellow');
      return;
    }

    log('✅ 邀请码已生成', 'green');
    log(`   邀请码: ${code}`, 'cyan');

    // 3. 模拟邀请码验证
    logSection('🔍 模拟邀请码验证');

    log('\n⚠️  注意: 这只是显示如何验证，实际验证在注册时进行', 'yellow');
    log(`\n正确的邀请码应该是: ${code}`, 'cyan');
    log(`\n注册时应该使用的邀请码: ${code}`, 'green');

    // 4. 问题分析
    logSection('📋 问题分析');

    log('根据您的日志，邀请码验证失败，可能的原因:', 'yellow');
    log('\n1. 邀请人从未访问过"我的邀请"页面', 'yellow');
    log('   - 解决：让邀请人先访问"我的邀请"页面生成邀请码', 'yellow');

    log('\n2. 邀请人的积分记录中没有 invitationCode 字段', 'yellow');
    log('   - 解决：访问"我的邀请"页面会自动生成', 'yellow');

    log('\n3. 注册时输入的邀请码不正确', 'yellow');
    log('   - 解决：确保输入的邀请码与邀请人的邀请码完全一致', 'yellow');

    log('\n4. 邀请码格式不正确', 'yellow');
    log('   - 解决：邀请码应该是16位大写字母和数字', 'yellow');

    // 5. 推荐操作
    logSection('💡 推荐操作');

    log('请按以下步骤操作:', 'cyan');
    log('\n步骤1：让邀请人生成邀请码', 'yellow');
    log('  a. 使用邀请人账号登录系统');
    log('  b. 访问 /my-invitation 页面');
    log('  c. 复制显示的邀请码');

    log('\n步骤2：使用邀请码注册新账号', 'yellow');
    log(`  a. 访问注册页面`);
    log('  b. 输入用户名、密码和卡密');
    log(`  c. 在"邀请码"字段输入: ${code}`);
    log('  d. 提交注册');

    log('\n步骤3：验证积分奖励', 'yellow');
    log('  a. 使用邀请人账号登录');
    log('  b. 访问"我的邀请"页面');
    log('  c. 检查"累计奖励"是否增加');

    log('\n步骤4：查看服务器日志', 'yellow');
    log('  a. 在运行 npm run dev 的终端中');
    log('  b. 查找"邀请码验证结果"');
    log('  c. 应该看到 "valid: true"');

    // 6. 手动修复邀请码（如果有需要）
    logSection('🔧 手动修复邀请码（可选）');

    log('如果邀请人的积分记录已损坏，可以尝试:', 'yellow');
    log('\n方案1：删除邀请人的积分记录，重新生成', 'yellow');
    log('  - 在数据库中删除 user:points:<邀请人用户名>');
    log('  - 让邀请人重新访问"我的邀请"页面');

    log('\n方案2：使用测试脚本验证功能', 'yellow');
    log('  - 运行: node tests/test-invitation-points.js');
    log('  - 测试脚本会自动创建邀请人和被邀请人');
  } catch (error) {
    log(`\n❌ 检查过程中发生错误:`, 'red');
    log(error.message, 'red');
    log(error.stack, 'red');
  }
}

// 运行检查
logSection('🚀 开始检查邀请人邀请码');
log(`邀请人用户名: ${INVITER_USERNAME}`, 'cyan');

checkInviterCode(INVITER_USERNAME)
  .then(() => {
    logSection('🏁 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    log(`检查失败: ${error.message}`, 'red');
    process.exit(1);
  });
