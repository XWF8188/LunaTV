# 卡密信息不显示问题 - 部署检查清单

## 部署前检查

### 代码检查

- [ ] 所有代码修改已完成
- [ ] 类型检查通过 (`pnpm run typecheck`)
- [ ] 代码格式化完成 (`pnpm run format`)
- [ ] 没有 console.error 或调试代码遗漏

### 文件清单

修改的文件:

- [ ] `src/lib/redis-base.db.ts`
- [ ] `src/lib/upstash.db.ts`
- [ ] `src/app/api/user/cardkey/route.ts`
- [ ] `src/components/UserCardKeyBinding.tsx`

新增的文件:

- [ ] `scripts/debug-cardkeys.js`
- [ ] `scripts/fix-cardkeys.js`
- [ ] `scripts/diagnose-user-cardkey.js`
- [ ] `scripts/quick-fix.sh`
- [ ] `docs/cardkey-debug-guide.md`
- [ ] `docs/cardkey-fix-summary.md`
- [ ] `CARDKEY_DISPLAY_ISSUE_QUICK_FIX.md`
- [ ] `tests/cardkey-display-fix.test.ts`

### 环境变量检查

- [ ] `UPSTASH_URL` 已设置
- [ ] `UPSTASH_TOKEN` 已设置
- [ ] `NEXT_PUBLIC_STORAGE_TYPE` 已设置 (应该是 "upstash" 或 "redis")

## 部署步骤

### 1. 备份数据

```bash
# 备份当前 Redis 数据
# 使用 Upstash 控制台或 API 备份
# 或者运行调试脚本导出数据
node scripts/debug-cardkeys.js > redis-backup-$(date +%Y%m%d-%H%M%S).txt
```

### 2. 构建项目

```bash
# 安装依赖
pnpm install

# 运行类型检查
pnpm run typecheck

# 构建项目
pnpm build
```

### 3. 测试构建

```bash
# 本地测试构建结果
pnpm start
```

### 4. 部署到生产环境

根据您的部署流程操作:

#### 如果使用 Vercel:

```bash
vercel --prod
```

#### 如果使用 Docker:

```bash
docker build -t your-app:latest .
docker push your-registry/your-app:latest
# 然后使用 k8s 或其他编排工具部署
```

#### 如果使用传统部署:

```bash
# 上传构建产物
scp -r .next/ server:/path/to/app/

# 或者在服务器上构建
git pull
pnpm install
pnpm build
pm2 restart app
```

### 5. 验证部署

#### 5.1 检查服务状态

```bash
# 检查进程
pm2 list
# 或
systemctl status your-app

# 检查端口
netstat -tlnp | grep :3000
```

#### 5.2 检查日志

```bash
# 查看最新日志
tail -f logs/your-log-file.log

# 检查是否有错误
tail -n 100 logs/your-log-file.log | grep -i error
```

#### 5.3 测试 API

```bash
# 测试健康检查
curl http://your-domain.com/api/health

# 测试卡密 API (需要先登录获取 cookie)
curl -b cookies.txt http://your-domain.com/api/user/cardkey
```

#### 5.4 测试前端

- 打开浏览器访问系统
- 登录测试账号
- 进入"卡密绑定"页面
- 检查卡密信息是否正常显示

### 6. 运行诊断工具

在生产服务器上:

```bash
# 设置环境变量
export UPSTASH_URL=your_upstash_url
export UPSTASH_TOKEN=your_upstash_token

# 运行快速修复脚本
./scripts/quick-fix.sh

# 选择选项 2 扫描所有卡密数据
```

## 部署后监控

### 1. 监控错误率

- 查看错误日志
- 监控 API 错误率
- 检查是否有新的错误出现

### 2. 监控性能

- API 响应时间
- 数据库查询时间
- Redis 连接状态

### 3. 用户反馈

- 收集用户反馈
- 检查是否有新的问题报告

## 回滚计划

如果出现问题需要回滚:

### 1. 快速回滚代码

```bash
# 回滚到上一个版本
git revert HEAD
# 或
git checkout <previous-commit-hash>

# 重新构建和部署
pnpm build
# 部署命令
```

### 2. 恢复数据

```bash
# 恢复 Redis 数据
# 使用备份文件恢复
```

### 3. 验证回滚

```bash
# 检查服务状态
pm2 status

# 检查日志
tail -f logs/your-log-file.log

# 测试功能
```

## 常见问题排查

### 问题 1: 构建失败

**症状**: `pnpm build` 报错

**排查**:

1. 检查依赖是否完整: `pnpm install`
2. 检查类型错误: `pnpm run typecheck`
3. 检查环境变量: `env | grep UPSTASH`

### 问题 2: API 返回 500 错误

**症状**: `/api/user/cardkey` 返回 500

**排查**:

1. 查看服务器日志: `tail -f logs/your-log-file.log`
2. 检查 Redis 连接: 测试 `UPSTASH_URL` 和 `UPSTASH_TOKEN`
3. 检查数据一致性: 运行诊断工具

### 问题 3: 前端不显示卡密信息

**症状**: 部署后,前端仍然不显示卡密信息

**排查**:

1. 清除浏览器缓存
2. 检查浏览器控制台错误
3. 检查网络请求是否成功
4. 运行诊断工具检查数据

### 问题 4: 修复工具无法运行

**症状**: `node scripts/fix-cardkeys.js` 报错

**排查**:

1. 检查 Node.js 版本: `node --version`
2. 检查环境变量: `env | grep UPSTASH`
3. 检查脚本权限: `ls -la scripts/`
4. 检查 @upstash/redis 是否安装: `pnpm list @upstash/redis`

## 联系信息

- 技术支持: [your-support-email]
- 文档: [your-docs-url]
- 问题追踪: [your-issue-tracker-url]

## 更新日志

- 2026-02-15: 初始版本,完成部署检查清单
