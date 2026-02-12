/**
 * 初始化管理员账号和测试卡密系统
 * 使用方法: node scripts/init-admin.js
 */

const readline = require('readline');
const crypto = require('crypto');

// 简单的 SHA-256 哈希函数
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 生成随机卡密
function generateRandomCardKey() {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 16;
  let result = '';

  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

// 计算过期时间
function calculateExpiryDate(type) {
  const duration = {
    year: 365,
    quarter: 90,
    month: 30,
    week: 7,
  };
  const days = duration[type] || 30;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Date.now() + days * msPerDay;
}

// 主函数
async function main() {
  console.log('=== 卡密系统初始化工具 ===\n');

  // 1. 显示环境变量配置说明
  console.log('【步骤 1】配置环境变量');
  console.log('请创建 .env.local 文件并添加以下内容:\n');
  console.log('# 站长账号');
  console.log('USERNAME=admin');
  console.log('PASSWORD=123456\n');
  console.log('# 存储类型 (选择其一)');
  console.log('NEXT_PUBLIC_STORAGE_TYPE=upstash\n');
  console.log('# 如果使用 Upstash');
  console.log('UPSTASH_URL=https://your-redis-url.upstash.io');
  console.log('UPSTASH_TOKEN=your-token-here\n');
  console.log('# 如果使用 Redis');
  console.log('REDIS_URL=redis://localhost:6379\n');
  console.log('# 如果使用 Kvrocks');
  console.log('KVROCKS_URL=redis://localhost:6666\n');

  // 2. 生成测试卡密
  console.log('\n【步骤 2】生成测试卡密');
  console.log('以下是生成的测试卡密（每个类型 3 个）:\n');

  const cardKeys = {
    year: [],
    quarter: [],
    month: [],
    week: [],
  };

  for (const type of Object.keys(cardKeys)) {
    console.log(`${type.toUpperCase()} 卡密 (${calculateExpiryDate(type)}):`);
    for (let i = 0; i < 3; i++) {
      const key = generateRandomCardKey();
      cardKeys[type].push(key);
      console.log(`  ${i + 1}. ${key}`);
    }
    console.log('');
  }

  // 3. 显示 API 测试步骤
  console.log('【步骤 3】测试 API');
  console.log('启动开发服务器后，可以使用以下命令测试:\n');

  console.log('# 1. 登录 (获取管理员 cookie)');
  console.log('curl -X POST http://localhost:3000/api/login \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"username":"admin","password":"123456"}\' \\');
  console.log('  -c cookies.txt\n');

  console.log('# 2. 创建普通用户');
  console.log('curl -X POST http://localhost:3000/api/admin/user \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -b cookies.txt \\');
  console.log(
    '  -d \'{"action":"add","targetUsername":"testuser","targetPassword":"123456"}\'\n',
  );

  console.log('# 3. 创建管理员卡密');
  console.log('curl -X POST http://localhost:3000/api/admin/cardkey \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -b cookies.txt \\');
  console.log('  -d \'{"action":"create","type":"week","count":5}\'\n');

  console.log('# 4. 查看所有卡密');
  console.log('curl -X GET http://localhost:3000/api/admin/cardkey \\');
  console.log("  -b cookies.txt | jq'.cardKeys | length'\n");

  console.log('# 5. 用户绑定卡密');
  console.log('curl -X POST http://localhost:3000/api/user/cardkey \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -b cookies.txt \\');
  console.log('  -d \'{"cardKey":"' + cardKeys.week[0] + '"}\'\n');

  console.log('# 6. 查看用户卡密状态');
  console.log('curl -X GET http://localhost:3000/api/user/cardkey \\');
  console.log("  -b cookies.txt | jq'.cardKeyInfo'\n");

  console.log('# 7. 导出卡密列表');
  console.log('curl -X GET http://localhost:3000/api/admin/cardkey/export \\');
  console.log('  -b cookies.txt \\');
  console.log('  -o cardkeys.csv\n');

  // 4. 显示数据库存储结构
  console.log('\n【步骤 4】数据库存储结构');
  console.log('卡密系统使用以下 Redis 键结构:\n');
  console.log('cardkey:hash:{hash}      - 卡密数据 (JSON)');
  console.log('cardkey:status:unused    - 未使用卡密集合 (Set)');
  console.log('cardkey:status:used      - 已使用卡密集合 (Set)');
  console.log('cardkey:status:expired   - 已过期卡密集合 (Set)');
  console.log('cardkey:user:{username}   - 用户绑定的卡密 (String)\n');

  // 5. 创建 .env.local 模板
  console.log('【步骤 5】创建 .env.local 文件');
  console.log('是否要创建 .env.local 模板文件？(y/n)');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('> ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      const fs = require('fs');
      const envContent = `# 站长账号
USERNAME=admin
PASSWORD=123456

# 存储类型
NEXT_PUBLIC_STORAGE_TYPE=localstorage

# Upstash 配置 (可选)
# UPSTASH_URL=
# UPSTASH_TOKEN=

# Redis 配置 (可选)
# REDIS_URL=

# Kvrocks 配置 (可选)
# KVROCKS_URL=
`;

      fs.writeFileSync('.env.local', envContent);
      console.log('\n✓ 已创建 .env.local 文件');
      console.log('  请根据实际情况修改存储类型和数据库配置');
    }

    console.log('\n=== 初始化完成 ===');
    console.log('1. 编辑 .env.local 文件配置数据库');
    console.log('2. 运行 pnpm dev 启动开发服务器');
    console.log('3. 使用上述 API 命令测试卡密功能\n');

    rl.close();
  });
}

main().catch(console.error);
