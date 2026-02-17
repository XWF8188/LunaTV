/* eslint-disable no-console */
/**
 * 测试卡密系统
 * 运行方式: node scripts/test-cardkey.js
 */

// 模拟环境变量
process.env.USERNAME = 'admin';
process.env.PASSWORD = '123456';
process.env.NEXT_PUBLIC_STORAGE_TYPE = 'localstorage'; // 使用 localStorage 进行测试

// 由于需要实际的数据库存储，这里提供测试步骤说明
console.log('=== 卡密系统测试说明 ===\n');

console.log('1. 准备工作:');
console.log('   - 确保已配置数据库 (Redis/Upstash/Kvrocks)');
console.log('   - 设置环境变量:');
console.log('     USERNAME=admin');
console.log('     PASSWORD=123456');
console.log('     NEXT_PUBLIC_STORAGE_TYPE=redis/upstash/kvrocks');
console.log('     UPSTASH_URL=xxx');
console.log('     UPSTASH_TOKEN=xxx\n');

console.log('2. 测试步骤:');
console.log('');
console.log('   步骤1: 启动开发服务器');
console.log('   pnpm dev\n');
console.log('   步骤2: 使用 owner 账号登录');
console.log('   - 用户名: admin');
console.log('   - 密码: 123456\n');
console.log('   步骤3: 创建管理员账号');
console.log('   - 调用 POST /api/admin/user');
console.log('   - Body: {');
console.log('       "action": "add",');
console.log('       "targetUsername": "admin",');
console.log('       "targetPassword": "123456",');
console.log('       "userGroup": ""');
console.log('     }');
console.log('   - 将角色设置为 admin\n');
console.log('   步骤4: 创建测试卡密');
console.log('   - 调用 POST /api/admin/cardkey');
console.log('   - Body: {');
console.log('       "action": "create",');
console.log('       "type": "week",');
console.log('       "count": 3');
console.log('     }\n');
console.log('   步骤5: 查看卡密列表');
console.log('   - 调用 GET /api/admin/cardkey\n');
console.log('   步骤6: 创建测试用户并绑定卡密');
console.log('   - 调用 POST /api/admin/user 创建普通用户');
console.log('   - 调用 POST /api/user/cardkey 绑定卡密');
console.log('   - Body: { "cardKey": "生成的卡密" }\n');
console.log('   步骤7: 测试过期检查');
console.log('   - 创建一个已过期的卡密');
console.log('   - 使用该卡密登录应该失败\n');
console.log('   步骤8: 测试管理员豁免');
console.log('   - 管理员登录应该不受卡密限制\n');

console.log('=== API 测试命令示例 ===\n');

console.log('# 1. 登录获取 cookie');
console.log('curl -X POST http://localhost:3000/api/login \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"username":"admin","password":"123456"}\' \\');
console.log('  -c cookies.txt\n');

console.log('\n# 2. 创建管理员账号');
console.log('curl -X POST http://localhost:3000/api/admin/user \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -b cookies.txt \\');
console.log(
  '  -d \'{"action":"add","targetUsername":"admin2","targetPassword":"123456"}\'\n',
);

console.log('# 3. 设置为管理员');
console.log('curl -X POST http://localhost:3000/api/admin/user \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -b cookies.txt \\');
console.log('  -d \'{"action":"setAdmin","targetUsername":"admin2"}\'\n');

console.log('# 4. 创建卡密');
console.log('curl -X POST http://localhost:3000/api/admin/cardkey \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -b cookies.txt \\');
console.log('  -d \'{"action":"create","type":"week","count":3}\'\n');

console.log('# 5. 获取卡密列表');
console.log('curl -X GET http://localhost:3000/api/admin/cardkey \\');
console.log('  -b cookies.txt\n');

console.log('# 6. 用户绑定卡密');
console.log('curl -X POST http://localhost:3000/api/user/cardkey \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -b cookies.txt \\');
console.log('  -d \'{"cardKey":"生成的卡密"}\'\n');

console.log('# 7. 查看用户卡密状态');
console.log('curl -X GET http://localhost:3000/api/user/cardkey \\');
console.log('  -b cookies.txt\n');

console.log('# 8. 导出卡密');
console.log('curl -X GET http://localhost:3000/api/admin/cardkey/export \\');
console.log('  -b cookies.txt \\');
console.log('  -o cardkeys.csv\n');

console.log('\n=== 注意事项 ===');
console.log('- 管理员 (owner/admin) 不需要绑定卡密');
console.log('- 普通用户登录时需要检查卡密是否过期');
console.log('- 卡密过期后无法登录，提示在设置页面重新绑定');
console.log(
  '- 支持的卡密类型: year (1年), quarter (1季/90天), month (1月/30天), week (1周/7天)\n',
);
