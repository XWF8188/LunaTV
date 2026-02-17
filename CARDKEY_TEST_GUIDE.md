# 卡密系统测试指南

## 快速开始

### 1. 环境配置

已创建 `.env.local` 文件，包含以下配置：

```env
# 站长账号
USERNAME=admin
PASSWORD=123456

# 存储类型 (localstorage 仅用于开发测试)
NEXT_PUBLIC_STORAGE_TYPE=localstorage
```

**重要**: 卡密系统需要使用 Redis/Upstash/Kvrocks 才能正常工作，localstorage 模式不支持卡密功能。

### 2. 测试卡密

初始化脚本已生成以下测试卡密：

| 类型    | 有效期 | 卡密               |
| ------- | ------ | ------------------ |
| YEAR    | 1年    | `ShyA699fhp6oXVdN` |
| YEAR    | 1年    | `dGxvY6vPSXxYM3iK` |
| YEAR    | 1年    | `SEgIxA5L5Ezpz9Xg` |
| QUARTER | 90天   | `7evp0E8cEADi3zCI` |
| QUARTER | 90天   | `bloZNzMllfiIfnv6` |
| QUARTER | 90天   | `Cx9mj3bOTVoxm9YD` |
| MONTH   | 30天   | `mJOBKAjWk5cBPwPT` |
| MONTH   | 30天   | `cDCAnosczkDrFyuj` |
| MONTH   | 30天   | `eTVMXmHY8vsFyntE` |
| WEEK    | 7天    | `RQyMhZRbBJwKZppo` |
| WEEK    | 7天    | `pbq87uCipGcQ8UB2` |
| WEEK    | 7天    | `HUiXnU6kP8dJaHZr` |

## API 测试步骤

### 步骤 1: 启动开发服务器

```bash
pnpm dev
```

### 步骤 2: 登录获取管理员 cookie

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' \
  -c cookies.txt
```

### 步骤 3: 创建普通用户

```bash
curl -X POST http://localhost:3000/api/admin/user \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"action":"add","targetUsername":"testuser","targetPassword":"123456"}'
```

### 步骤 4: 创建卡密（管理员功能）

```bash
curl -X POST http://localhost:3000/api/admin/cardkey \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"action":"create","type":"week","count":5}'
```

响应示例：

```json
{
  "ok": true,
  "result": {
    "keys": ["AbCdEf1234567890", "XyZ1234567890AbC", ...],
    "totalCount": 5,
    "type": "week"
  }
}
```

### 步骤 5: 查看所有卡密

```bash
curl -X GET http://localhost:3000/api/admin/cardkey -b cookies.txt | jq
```

响应示例：

```json
{
  "cardKeys": [
    {
      "key": "abc123...",
      "keyType": "week",
      "status": "unused",
      "createdAt": 1706745600000,
      "expiresAt": 1707350400000,
      "boundTo": null,
      "boundAt": null
    }
  ]
}
```

### 步骤 6: 用户绑定卡密

```bash
curl -X POST http://localhost:3000/api/user/cardkey \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"cardKey":"RQyMhZRbBJwKZppo"}'
```

响应示例：

```json
{
  "ok": true,
  "cardKeyInfo": {
    "boundKey": "5f4d...",
    "expiresAt": 1771481426259,
    "boundAt": 1706745600000,
    "daysRemaining": 7,
    "isExpiring": true,
    "isExpired": false
  }
}
```

### 步骤 7: 查看用户卡密状态

```bash
curl -X GET http://localhost:3000/api/user/cardkey -b cookies.txt | jq
```

### 步骤 8: 导出卡密列表

```bash
curl -X GET http://localhost:3000/api/admin/cardkey/export \
  -b cookies.txt \
  -o cardkeys.csv
```

### 步骤 9: 清理过期卡密

```bash
curl -X POST http://localhost:3000/api/admin/cardkey \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"action":"cleanup"}'
```

### 步骤 10: 删除未使用的卡密

```bash
# 首先获取卡密列表，找到要删除的卡密哈希
curl -X GET http://localhost:3000/api/admin/cardkey -b cookies.txt | jq '.cardKeys[0].key'

# 然后删除
curl -X DELETE "http://localhost:3000/api/admin/cardkey?hash=卡密哈希" \
  -b cookies.txt
```

## 功能测试场景

### 场景 1: 管理员豁免

管理员（owner/admin）不需要绑定卡密，可以直接登录。

```bash
# 管理员登录应该成功
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

### 场景 2: 普通用户登录（未绑定卡密）

如果普通用户没有绑定卡密，应该能够登录（首次注册需要绑定卡密）。

### 场景 3: 卡密过期检查

创建一个立即过期的卡密（需要修改代码或数据库），绑定后应该无法登录。

### 场景 4: 卡密过期提醒

前端可以调用 `GET /api/user/cardkey` 获取剩余天数：

- `daysRemaining <= 30`: 显示一般提醒
- `daysRemaining <= 7`: 显示紧急提醒
- `isExpired == true`: 提示重新绑定

### 场景 5: 重新绑定卡密

用户可以绑定新的卡密来延长有效期，新卡密的过期时间必须晚于当前卡密。

```bash
curl -X POST http://localhost:3000/api/user/cardkey \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"cardKey":"新的卡密"}'
```

## 数据库存储结构

卡密系统使用以下 Redis 键结构：

```
cardkey:hash:{hash}      - 卡密数据 (JSON)
cardkey:status:unused    - 未使用卡密集合 (Set)
cardkey:status:used      - 已使用卡密集合 (Set)
cardkey:status:expired   - 已过期卡密集合 (Set)
```

用户卡密信息存储在 `AdminConfig.UserConfig.Users[].cardKey` 中：

```typescript
{
  "boundKey": "5f4d...",      // 卡密哈希
  "expiresAt": 1771481426259,  // 过期时间戳
  "boundAt": 1706745600000     // 绑定时间戳
}
```

## 故障排查

### 问题 1: 登录时提示"不支持本地存储进行卡密管理"

**原因**: 卡密系统需要 Redis/Upstash/Kvrocks，localstorage 不支持。

**解决**: 修改 `.env.local` 中的 `NEXT_PUBLIC_STORAGE_TYPE` 为 `redis`、`upstash` 或 `kvrocks`。

### 问题 2: 无法创建卡密

**原因**: 可能是数据库连接失败或权限不足。

**解决**:

1. 检查数据库连接配置
2. 确认登录用户是 owner 或 admin 角色

### 问题 3: 用户绑定卡密失败

**原因**:

1. 卡密无效或不存在
2. 卡密已被使用
3. 卡密已过期
4. 新卡密过期时间不晚于当前卡密

**解决**: 检查错误信息，使用有效的未使用卡密。

### 问题 4: 卡密过期后仍能登录

**原因**: 可能是管理员账号或缓存问题。

**解决**:

1. 确认用户角色不是 owner/admin
2. 检查登录 API 是否正确检查卡密过期

## 注意事项

1. **管理员豁免**: owner 和 admin 角色不受卡密限制
2. **卡密安全性**: 卡密使用 SHA-256 哈希存储，明文仅在创建时返回一次
3. **过期时间**: 从创建卡密时开始计算，不是从绑定时开始
4. **绑定限制**: 每个卡密只能被一个用户绑定一次
5. **删除限制**: 已绑定的卡密不能删除
6. **存储要求**: 必须使用 Redis/Upstash/Kvrocks，localstorage 不支持

## 下一步

1. 配置生产数据库（Redis/Upstash/Kvrocks）
2. 前端集成卡密绑定界面
3. 前端集成卡密过期提醒组件
4. 管理后台集成卡密管理界面
