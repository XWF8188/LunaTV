# 卡密绑定信息不显示问题诊断指南

## 问题描述

用户已绑定卡密,但在"卡密绑定"页面不显示已绑定卡密信息,或者显示"未绑定卡密"。

## 可能的原因

1. **Redis 数据不一致**: 用户绑定的卡密 `boundKey` 在 Redis 中找不到对应的卡密数据
2. **keyHash 不匹配**: 绑定时保存的 `keyHash` 与实际卡密的 `keyHash` 不一致
3. **数据丢失**: Redis 中的卡密数据被意外删除

## 诊断步骤

### 1. 使用调试脚本检查 Redis 数据

在生产服务器上运行调试脚本:

```bash
# 确保 UPSTASH_URL 和 UPSTASH_TOKEN 环境变量已设置
export UPSTASH_URL=your_upstash_url
export UPSTASH_TOKEN=your_upstash_token

# 运行调试脚本
node scripts/debug-cardkeys.js
```

脚本会输出:

- 所有卡密相关的 Redis 键
- 所有卡密数据的详细信息
- 所有用户卡密绑定信息
- 卡密状态集合

### 2. 查看服务器日志

在 API 调用时,查看服务器日志中的详细输出:

```bash
# 查看最新的日志
tail -f logs/your-log-file.log | grep "getFullUserCardKey"
```

日志会显示:

- 用户名
- 用户卡密绑定信息 (`userCardKeyInfo`)
- 所有卡密的 `keyHash` 列表
- 查找结果 (`found cardKey`)

### 3. 常见日志输出及含义

#### 正常情况

```
=== getFullUserCardKey 开始 ===
userName: testuser
userCardKeyInfo: { "boundKey": "abc123...", "expiresAt": 1234567890, ... }
getFullUserCardKey - allCardKeys count: 10
getFullUserCardKey - 查找 boundKey: abc123...
getFullUserCardKey - found cardKey: { "key": "plaintext_key", "keyHash": "abc123...", ... }
getFullUserCardKey - 返回结果: { "plainKey": "plaintext_key", ... }
```

#### 问题情况 - 找不到卡密

```
=== getFullUserCardKey 开始 ===
userName: testuser
userCardKeyInfo: { "boundKey": "abc123...", "expiresAt": 1234567890, ... }
getFullUserCardKey - allCardKeys count: 10
getFullUserCardKey - 查找 boundKey: abc123...
getFullUserCardKey - found cardKey: null
未找到匹配的卡密, boundKey: abc123..., 所有卡密 keyHash: [def456..., ghi789...]
```

**原因**: 用户的 `boundKey` 不在 `getAllCardKeys()` 返回的列表中。

#### 问题情况 - 没有用户卡密信息

```
=== getFullUserCardKey 开始 ===
userName: testuser
userCardKeyInfo 不存在,返回 null
```

**原因**: 用户没有绑定卡密,或者用户卡密信息丢失。

## 解决方案

### 方案 1: 数据不一致 - 重新绑定卡密

如果用户的 `boundKey` 找不到对应的卡密数据,但用户确实应该有卡密:

1. **检查是否有备用卡密数据**: 如果卡密数据在其他地方有备份,可以恢复
2. **用户重新绑定**: 让用户使用新的卡密重新绑定

### 方案 2: 用户卡密信息丢失 - 恢复数据

如果用户卡密信息丢失 (`userCardKeyInfo` 为 null):

1. **从备份恢复**: 如果有数据库备份,从备份中恢复用户数据
2. **管理员手动修复**: 使用管理 API 手动设置用户的卡密信息

### 方案 3: 临时绕过检查 (不推荐)

如果确认用户应该有卡密权限,可以临时修改代码绕过 `getFullUserCardKey` 的检查:

**修改 `src/lib/db.ts` 的 `getUserCardKey` 方法**:

```typescript
async getUserCardKey(userName: string): Promise<UserCardKeyInfo | null> {
  const cardKeyInfo = await this.getUserCardKeyInfo(userName);

  if (!cardKeyInfo) {
    return null;
  }

  // 临时: 直接使用 cardKeyInfo,不查找 plainKey
  const now = Date.now();
  const daysRemaining = Math.ceil((cardKeyInfo.expiresAt - now) / (1000 * 60 * 60 * 24));

  return {
    // plainKey: cardKey.key,  // 注释掉,不返回 plainKey
    boundKey: cardKeyInfo.boundKey,
    expiresAt: cardKeyInfo.expiresAt,
    boundAt: cardKeyInfo.boundAt,
    daysRemaining,
    isExpiring: daysRemaining <= 30,
    isExpired: daysRemaining <= 0,
  };
}
```

**注意**: 这样做会隐藏卡密的明文显示,但不影响功能。这不是长久之计,应该尽快修复数据。

## 预防措施

1. **定期备份 Redis 数据**: 使用 Upstash 的备份功能定期备份
2. **监控 Redis 数据一致性**: 定期运行调试脚本检查数据
3. **添加数据修复工具**: 创建一个工具可以批量修复不一致的数据

## 开发环境调试

在开发环境中,可以使用以下步骤重现和调试问题:

1. 创建测试用户
2. 创建测试卡密
3. 绑定卡密到用户
4. 手动删除 Redis 中的卡密数据 (模拟数据丢失)
5. 访问用户页面查看错误

## 相关文件

- `src/lib/cardkey.ts`: 卡密业务逻辑
- `src/lib/redis-base.db.ts`: Redis 基础数据库操作
- `src/lib/upstash.db.ts`: Upstash 数据库操作
- `src/lib/db.ts`: 数据库统一接口
- `src/app/api/user/cardkey/route.ts`: 卡密 API 路由
- `src/components/UserCardKeyBinding.tsx`: 卡密绑定组件
- `scripts/debug-cardkeys.js`: 调试脚本
