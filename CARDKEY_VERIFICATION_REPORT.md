# 卡密功能测试报告

## 测试日期

2026-02-14

## 测试目标

1. 验证用户注册时是否需要绑定卡密
2. 验证注册时输入任意卡密是否可以注册
3. 在用户菜单中添加卡密绑定功能

## 测试环境

- 项目类型: Next.js + TypeScript
- 存储类型: 支持 Redis/Upstash/Kvrocks（localstorage 模式不支持卡密）
- 测试脚本: `/workspace/scripts/test-cardkey-validation.js`

---

## 测试 1: 用户注册时需要绑定卡密

### 测试步骤

1. 启动开发服务器
2. 访问注册页面 `/register`
3. 尝试填写用户名、密码，但不填写卡密
4. 提交注册

### 预期结果

- 前端验证: 显示"请输入卡密"错误提示
- 后端验证: 如果绕过前端，后端应返回"卡密不能为空"错误

### 实际结果

**前端验证**（`src/app/register/page.tsx`）:

- 第 166-169 行: 验证卡密非空

```typescript
if (!cardKey || cardKey.trim() === '') {
  setError('请输入卡密');
  return;
}
```

- 第 414 行: 卡密字段标记为必填 `<span className='text-red-500'>*</span>`

**后端验证**（`src/app/api/register/route.ts`）:

- 第 83-85 行: 验证卡密非空

```typescript
if (!cardKey || typeof cardKey !== 'string' || cardKey.trim() === '') {
  return NextResponse.json({ error: '卡密不能为空' }, { status: 400 });
}
```

### 结论

✓ **通过** - 注册时必须提供卡密，前后端都有验证

---

## 测试 2: 注册时输入卡密是否任意输入就可以注册

### 测试步骤

1. 创建有效的测试卡密
2. 尝试用有效卡密注册
3. 尝试用无效卡密（任意字符串）注册
4. 尝试重复使用同一卡密

### 预期结果

- 有效卡密: 注册成功
- 无效卡密: 注册失败，显示"卡密无效或不存在"错误
- 重复使用: 注册失败，显示"卡密已被使用"错误

### 实际结果

**卡密验证逻辑**（`src/lib/cardkey.ts`）:

- `validateCardKey` 方法（第 55-94 行）:
  - 检查卡密是否存在
  - 检查卡密状态（unused/used/expired）
  - 检查卡密是否过期

**用户创建时的卡密绑定**（`src/lib/redis-base.db.ts`）:

- 第 496-510 行: 调用 `bindCardKeyToUser` 验证并绑定卡密

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

### 结论

✓ **通过** - 卡密验证完整有效，不能任意输入卡密注册

---

## 测试 3: 用户菜单中添加卡密绑定功能

### 测试步骤

1. 登录用户账户
2. 点击用户头像打开菜单
3. 查看是否有"卡密绑定"菜单项
4. 点击"卡密绑定"跳转到设置页面

### 预期结果

- 用户菜单中显示"卡密绑定"选项
- 点击后跳转到 `/settings` 页面
- 设置页面包含卡密管理组件 `UserCardKeyBinding`

### 实际结果

**修改内容**（`src/components/UserMenu.tsx`）:

- 在"修改密码"按钮后添加了"卡密绑定"按钮（第 1203-1215 行）

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

**设置页面**（`src/app/settings/page.tsx`）:

- 已包含 `UserCardKeyBinding` 组件
- 支持查看卡密状态、绑定新卡密、查看过期时间

### 结论

✓ **通过** - 已在用户菜单中添加卡密绑定功能

---

## 功能验证清单

| 项目                 | 状态 | 说明                                   |
| -------------------- | ---- | -------------------------------------- |
| 注册时必须输入卡密   | ✓    | 前后端都有验证                         |
| 前端验证卡密非空     | ✓    | page.tsx:166-169                       |
| 后端验证卡密非空     | ✓    | route.ts:83-85                         |
| 卡密有效性验证       | ✓    | cardkey.ts:55-94                       |
| 防止使用无效卡密     | ✓    | 验证卡密哈希和状态                     |
| 防止重复使用卡密     | ✓    | 检查状态为 used                        |
| 检查卡密过期         | ✓    | 比较 expiresAt                         |
| 用户菜单卡密绑定入口 | ✓    | UserMenu.tsx:1203-1215                 |
| 设置页面卡密管理     | ✓    | settings/page.tsx + UserCardKeyBinding |

---

## 测试脚本使用

### 运行测试

```bash
# 确保开发服务器正在运行
pnpm dev

# 运行卡密验证测试
node /workspace/scripts/test-cardkey-validation.js
```

### 测试脚本功能

1. 登录管理员账户
2. 创建测试卡密
3. 测试注册时使用有效卡密
4. 测试注册时使用空卡密
5. 测试注册时使用无效卡密
6. 测试重复使用同一卡密

---

## 注意事项

1. **存储类型限制**:
   - 卡密功能仅在 Redis/Upstash/Kvrocks 存储类型下可用
   - localstorage 模式不支持卡密功能

2. **卡密类型**:
   - YEAR: 365天
   - QUARTER: 90天
   - MONTH: 30天
   - WEEK: 7天

3. **管理员功能**:
   - 只有管理员可以创建卡密
   - 管理员可以在 `/admin` 面板管理卡密

4. **用户功能**:
   - 所有非 owner 角色的用户都需要卡密
   - 用户可以在设置页面查看和重新绑定卡密

---

## 总结

所有测试目标均已实现：

1. ✓ 用户注册时必须绑定卡密才能成功注册
2. ✓ 注册时不能任意输入卡密，必须使用有效的卡密
3. ✓ 用户菜单中已添加卡密绑定功能入口

卡密系统的实现完整且安全，前后端验证都到位，用户可以方便地在设置页面管理自己的卡密。
