# 卡密功能快速参考

## 功能概述

卡密系统用于控制用户注册和访问权限。用户注册时必须提供有效的卡密，卡密绑定后账户才可正常使用。

---

## 1. 用户注册流程

### 前端验证（注册页面）

**文件**: `src/app/register/page.tsx`

- **第 166-169 行**: 前端验证卡密非空

```typescript
if (!cardKey || cardKey.trim() === '') {
  setError('请输入卡密');
  return;
}
```

- **第 409-433 行**: 卡密输入框（必填字段）

```tsx
<div className='group'>
  <label htmlFor='cardKey' className='...'>
    卡密 <span className='text-red-500'>*</span>
  </label>
  <input
    id='cardKey'
    type='text'
    value={cardKey}
    onChange={(e) => setCardKey(e.target.value)}
    placeholder='请输入注册卡密'
  />
</div>
```

### 后端验证（注册接口）

**文件**: `src/app/api/register/route.ts`

- **第 83-85 行**: 后端验证卡密非空

```typescript
if (!cardKey || typeof cardKey !== 'string' || cardKey.trim() === '') {
  return NextResponse.json({ error: '卡密不能为空' }, { status: 400 });
}
```

- **第 160-171 行**: 调用 createUserV2 传递卡密

```typescript
await db.createUserV2(
  username,
  password,
  'user',
  defaultTags,
  undefined,
  undefined,
  cardKey, // 注册卡密
);
```

### 卡密验证和绑定

**文件**: `src/lib/redis-base.db.ts`

- **第 496-510 行**: 在创建用户时验证并绑定卡密

```typescript
if (cardKey) {
  try {
    const { cardKeyService } = await import('./cardkey');
    const bindingResult = await cardKeyService.bindCardKeyToUser(
      cardKey,
      userName,
    );
    if (!bindingResult.success) {
      throw new Error(bindingResult.error || '卡密绑定失败');
    }
  } catch (error) {
    console.error('绑定卡密失败:', error);
    throw new Error('卡密绑定失败: ' + (error as Error).message);
  }
}
```

---

## 2. 卡密验证逻辑

**文件**: `src/lib/cardkey.ts`

### 验证卡密有效性（第 55-94 行）

```typescript
async validateCardKey(cardKey: string): Promise<CardKeyValidationResult> {
  const hashedKey = await this.hashCardKey(cardKey);
  const storedCardKey = await db.getCardKey(hashedKey);

  if (!storedCardKey) {
    return {
      valid: false,
      error: '卡密无效或不存在',
    };
  }

  if (storedCardKey.status === 'used') {
    return {
      valid: false,
      error: '卡密已被使用',
    };
  }

  if (storedCardKey.status === 'expired') {
    return {
      valid: false,
      error: '卡密已过期',
    };
  }

  const now = Date.now();
  if (storedCardKey.expiresAt < now) {
    await db.updateCardKey(hashedKey, { status: 'expired' });
    return {
      valid: false,
      error: '卡密已过期',
    };
  }

  return {
    valid: true,
    cardKey: storedCardKey,
  };
}
```

### 绑定卡密到用户（第 97-144 行）

```typescript
async bindCardKeyToUser(
  cardKey: string,
  username: string,
): Promise<{ success: boolean; error?: string }> {
  // 验证卡密
  const validation = await this.validateCardKey(cardKey);
  if (!validation.valid || !validation.cardKey) {
    return {
      success: false,
      error: validation.error || '卡密验证失败',
    };
  }

  // 检查新卡密的过期时间是否晚于当前卡密
  const currentCardKeyInfo = await db.getUserCardKeyInfo(username);
  if (currentCardKeyInfo) {
    const newExpiryDate = validation.cardKey.expiresAt;
    const currentExpiryDate = currentCardKeyInfo.expiresAt;

    if (newExpiryDate <= currentExpiryDate) {
      return {
        success: false,
        error: '新卡密的过期时间不能早于或等于当前卡密',
      };
    }
  }

  // 更新卡密状态为已使用
  await db.updateCardKey(hashedKey, {
    status: 'used',
    boundTo: username,
    boundAt: Date.now(),
  });

  // 更新用户卡密信息
  const userCardKeyInfo = {
    boundKey: hashedKey,
    expiresAt: validation.cardKey.expiresAt,
    boundAt: Date.now(),
  };
  await db.updateUserCardKeyInfo(username, userCardKeyInfo);

  return { success: true };
}
```

---

## 3. 用户菜单卡密绑定入口

**文件**: `src/components/UserMenu.tsx`

### 菜单项添加（第 1203-1215 行）

```typescript
{/* 卡密绑定按钮 */}
{showChangePassword && (
  <button
    onClick={() => {
      handleCloseMenu();
      router.push('/settings');
    }}
    className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-[background-color] duration-150 ease-in-out text-sm'
  >
    <KeyRound className='w-4 h-4 text-gray-500 dark:text-gray-400' />
    <span className='font-medium'>卡密绑定</span>
  </button>
)}
```

### 显示条件

- `showChangePassword` 变量控制显示
- 条件：用户角色不是 owner 且存储类型不是 localstorage

```typescript
const showChangePassword =
  authInfo?.role !== 'owner' && storageType !== 'localstorage';
```

---

## 4. 卡密管理页面

**文件**: `src/app/settings/page.tsx`

### 页面结构

```tsx
export default function SettingsPage() {
  return (
    <PageLayout>
      <div className='max-w-4xl mx-auto p-6'>
        <UserCardKeyBinding />
      </div>
    </PageLayout>
  );
}
```

### 卡密绑定组件

**文件**: `src/components/UserCardKeyBinding.tsx`

功能：

- 显示当前卡密状态
- 查看过期时间和剩余天数
- 绑定新卡密延长有效期
- 自动显示过期警告

---

## 5. API 端点

### 用户卡密接口

**文件**: `src/app/api/user/cardkey/route.ts`

#### GET - 获取卡密状态

```http
GET /api/user/cardkey
```

响应：

```json
{
  "hasCardKey": true,
  "cardKeyInfo": {
    "expiresAt": 1234567890000,
    "daysRemaining": 30,
    "isExpired": false,
    "isExpiring": false
  }
}
```

#### POST - 绑定新卡密

```http
POST /api/user/cardkey
Content-Type: application/json

{
  "cardKey": "AbCdEf1234567890"
}
```

响应：

```json
{
  "ok": true,
  "cardKeyInfo": {
    "expiresAt": 1234567890000,
    "daysRemaining": 30,
    "isExpired": false,
    "isExpiring": false
  }
}
```

---

## 6. 测试验证

### 测试脚本

**文件**: `/workspace/scripts/test-cardkey-validation.js`

运行测试：

```bash
# 确保开发服务器运行
pnpm dev

# 运行测试
node /workspace/scripts/test-cardkey-validation.js
```

### 测试覆盖

1. ✓ 注册时必须输入卡密（前后端验证）
2. ✓ 空卡密被拒绝
3. ✓ 无效卡密被拒绝
4. ✓ 有效卡密可以注册
5. ✓ 卡密不能重复使用

---

## 7. 常见错误

### 错误: 卡密不能为空

- **原因**: 注册时未提供卡密
- **解决**: 填写有效的卡密

### 错误: 卡密无效或不存在

- **原因**: 输入的卡密不存在
- **解决**: 联系管理员获取有效卡密

### 错误: 卡密已被使用

- **原因**: 卡密已被其他用户使用
- **解决**: 使用新的卡密

### 错误: 卡密已过期

- **原因**: 卡密已超过有效期
- **解决**: 联系管理员获取新卡密

### 错误: 新卡密的过期时间不能早于或等于当前卡密

- **原因**: 尝试绑定过期时间不晚于当前卡密的新卡密
- **解决**: 使用过期时间更晚的卡密

---

## 8. 卡密类型和有效期

| 类型    | 有效期 | 说明 |
| ------- | ------ | ---- |
| YEAR    | 365天  | 年卡 |
| QUARTER | 90天   | 季卡 |
| MONTH   | 30天   | 月卡 |
| WEEK    | 7天    | 周卡 |

---

## 9. 管理员功能

### 创建卡密

```bash
curl -X POST http://localhost:3000/api/admin/cardkey \
  -H "Content-Type: application/json" \
  -b "user_auth=..." \
  -d '{"action":"create","type":"week","count":5}'
```

### 查看所有卡密

```bash
curl -X GET http://localhost:3000/api/admin/cardkey \
  -b "user_auth=..."
```

---

## 10. 文件位置总结

| 功能         | 文件路径                                |
| ------------ | --------------------------------------- |
| 注册页面     | `src/app/register/page.tsx`             |
| 注册接口     | `src/app/api/register/route.ts`         |
| 卡密服务     | `src/lib/cardkey.ts`                    |
| 数据库操作   | `src/lib/redis-base.db.ts`              |
| 用户菜单     | `src/components/UserMenu.tsx`           |
| 卡密绑定组件 | `src/components/UserCardKeyBinding.tsx` |
| 设置页面     | `src/app/settings/page.tsx`             |
| 用户卡密接口 | `src/app/api/user/cardkey/route.ts`     |
| 测试脚本     | `scripts/test-cardkey-validation.js`    |
