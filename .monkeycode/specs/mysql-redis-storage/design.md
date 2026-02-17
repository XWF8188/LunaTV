# MySQL + Redis 混合存储方案设计

## 1. 方案概述

### 1.1 设计目标

将现有纯 Redis 存储方案升级为 **MySQL + Redis 混合存储**，实现：

- **MySQL**：持久化存储结构化数据，支持复杂查询和事务
- **Redis**：缓存热点数据，提供快速读写能力

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│                     (DbManager / IStorage)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HybridStorage (新实现)                       │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   MySQLStorage      │    │    RedisCache       │            │
│  │   (持久化存储)       │    │    (缓存层)          │            │
│  └─────────────────────┘    └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐           ┌─────────────────┐
│     MySQL       │           │     Redis       │
│   (主数据库)     │           │   (缓存/会话)    │
└─────────────────┘           └─────────────────┘
```

### 1.3 数据分层策略

| 数据类型   | 存储位置      | 说明                             |
| ---------- | ------------- | -------------------------------- |
| 用户信息   | MySQL + Redis | MySQL 持久化，Redis 缓存热点用户 |
| 卡密信息   | MySQL         | 需要事务和复杂查询               |
| 播放记录   | MySQL + Redis | MySQL 持久化，Redis 缓存最近记录 |
| 收藏记录   | MySQL         | 持久化存储                       |
| 搜索历史   | Redis         | 快速读写，自动过期               |
| 管理员配置 | MySQL + Redis | MySQL 持久化，Redis 缓存         |
| 会话/缓存  | Redis         | 临时数据，TTL 自动过期           |
| 积分/邀请  | MySQL         | 需要事务保证                     |

## 2. 数据库表结构设计

### 2.1 用户表 (users)

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL COMMENT 'SHA256 哈希密码',
    role ENUM('owner', 'admin', 'user') NOT NULL DEFAULT 'user',
    banned BOOLEAN DEFAULT FALSE,
    tags JSON COMMENT '用户标签数组',
    enabled_apis JSON COMMENT '启用的 API 列表',
    oidc_sub VARCHAR(255) COMMENT 'OIDC 唯一标识',
    tvbox_token VARCHAR(255) COMMENT 'TVBox Token',
    show_adult_content BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_oidc_sub (oidc_sub),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 卡密表 (card_keys)

```sql
CREATE TABLE card_keys (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    key_hash VARCHAR(128) NOT NULL UNIQUE COMMENT '卡密哈希值',
    plain_key VARCHAR(64) NOT NULL COMMENT '卡密明文',
    key_type ENUM('year', 'quarter', 'month', 'week') NOT NULL,
    status ENUM('unused', 'used', 'expired') NOT NULL DEFAULT 'unused',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL COMMENT '预设过期时间',
    bound_to VARCHAR(50) COMMENT '绑定的用户名',
    bound_at TIMESTAMP NULL COMMENT '绑定时间',
    INDEX idx_key_hash (key_hash),
    INDEX idx_status (status),
    INDEX idx_bound_to (bound_to),
    FOREIGN KEY (bound_to) REFERENCES users(username) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.3 用户卡密关联表 (user_card_keys)

```sql
CREATE TABLE user_card_keys (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    key_hash VARCHAR(128) NOT NULL,
    username VARCHAR(50) NOT NULL,
    key_type ENUM('year', 'quarter', 'month', 'week') NOT NULL,
    status ENUM('unused', 'used', 'expired') NOT NULL DEFAULT 'unused',
    source ENUM('invitation', 'redeem', 'manual') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    used_by VARCHAR(50) COMMENT '使用人',
    notes TEXT,
    INDEX idx_username (username),
    INDEX idx_key_hash (key_hash),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.4 播放记录表 (play_records)

```sql
CREATE TABLE play_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL COMMENT '资源站标识',
    content_id VARCHAR(255) NOT NULL COMMENT '内容ID',
    title VARCHAR(500) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    cover VARCHAR(1000),
    year VARCHAR(20),
    episode_index INT NOT NULL COMMENT '当前集数',
    total_episodes INT NOT NULL COMMENT '总集数',
    play_time INT NOT NULL COMMENT '播放进度(秒)',
    total_time INT NOT NULL COMMENT '总时长(秒)',
    search_title VARCHAR(500),
    remarks VARCHAR(500),
    douban_id BIGINT,
    content_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_content (username, source, content_id),
    INDEX idx_username (username),
    INDEX idx_updated_at (updated_at),
    INDEX idx_source (source),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.5 收藏表 (favorites)

```sql
CREATE TABLE favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    cover VARCHAR(1000),
    year VARCHAR(20),
    total_episodes INT,
    search_title VARCHAR(500),
    origin ENUM('vod', 'live', 'shortdrama'),
    content_type VARCHAR(50),
    release_date DATE,
    remarks VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_content (username, source, content_id),
    INDEX idx_username (username),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.6 剧集跳过配置表 (episode_skip_configs)

```sql
CREATE TABLE episode_skip_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    segments JSON NOT NULL COMMENT '跳过片段配置',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_content (username, source, content_id),
    INDEX idx_username (username),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.7 积分表 (user_points)

```sql
CREATE TABLE user_points (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    invitation_code VARCHAR(20) NOT NULL UNIQUE COMMENT '专属邀请码',
    balance INT NOT NULL DEFAULT 0 COMMENT '当前积分',
    total_earned INT NOT NULL DEFAULT 0 COMMENT '累计获得',
    total_redeemed INT NOT NULL DEFAULT 0 COMMENT '累计兑换',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_invitation_code (invitation_code),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.8 积分记录表 (points_records)

```sql
CREATE TABLE points_records (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    username VARCHAR(50) NOT NULL,
    type ENUM('earn', 'redeem', 'admin_adjust') NOT NULL,
    amount INT NOT NULL COMMENT '金额(正数)',
    reason VARCHAR(500) NOT NULL,
    related_user VARCHAR(50) COMMENT '关联用户',
    card_key_id VARCHAR(36) COMMENT '关联卡密',
    admin_username VARCHAR(50) COMMENT '管理员用户名',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.9 邀请记录表 (invitations)

```sql
CREATE TABLE invitations (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    inviter VARCHAR(50) NOT NULL COMMENT '邀请人',
    invitee VARCHAR(50) NOT NULL COMMENT '被邀请人',
    invitation_code VARCHAR(20) NOT NULL COMMENT '使用的邀请码',
    ip_address VARCHAR(45) NOT NULL,
    rewarded BOOLEAN DEFAULT FALSE COMMENT '是否已发放奖励',
    reward_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_invitee (invitee),
    INDEX idx_inviter (inviter),
    INDEX idx_invitation_code (invitation_code),
    FOREIGN KEY (inviter) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (invitee) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.10 IP 奖励记录表 (ip_reward_records)

```sql
CREATE TABLE ip_reward_records (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    ip_address VARCHAR(45) NOT NULL,
    inviter VARCHAR(50) NOT NULL,
    invitee VARCHAR(50) NOT NULL,
    reward_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_address (ip_address),
    INDEX idx_inviter (inviter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.11 管理员配置表 (admin_configs)

```sql
CREATE TABLE admin_configs (
    id INT PRIMARY KEY DEFAULT 1,
    config_key VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键名',
    config_value JSON NOT NULL COMMENT '配置值(JSON)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化配置存储结构
INSERT INTO admin_configs (id, config_key, config_value) VALUES
(1, 'main_config', '{}');
```

### 2.12 用户登录统计表 (user_login_stats)

```sql
CREATE TABLE user_login_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    login_count INT NOT NULL DEFAULT 0,
    first_login_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    last_login_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.13 内容热度统计表 (content_stats)

```sql
CREATE TABLE content_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source VARCHAR(100) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    source_name VARCHAR(255),
    cover VARCHAR(1000),
    year VARCHAR(20),
    play_count INT NOT NULL DEFAULT 0,
    total_watch_time BIGINT NOT NULL DEFAULT 0 COMMENT '总观看时长(秒)',
    unique_users INT NOT NULL DEFAULT 0 COMMENT '观看用户数',
    last_played_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_source_content (source, content_id),
    INDEX idx_play_count (play_count DESC),
    INDEX idx_last_played (last_played_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.14 邀请配置表 (invitation_configs)

```sql
CREATE TABLE invitation_configs (
    id INT PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN DEFAULT TRUE,
    reward_points INT DEFAULT 100,
    redeem_threshold INT DEFAULT 300,
    card_key_type ENUM('year', 'quarter', 'month', 'week') DEFAULT 'week',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化默认配置
INSERT INTO invitation_configs (id) VALUES (1);
```

## 3. Redis 缓存设计

### 3.1 缓存 Key 规范

```
# 用户相关缓存
user:{username}:info              # 用户信息 (TTL: 1小时)
user:{username}:points            # 用户积分 (TTL: 30分钟)

# 播放记录缓存
user:{username}:play_records      # 用户播放记录Hash (TTL: 1小时)
user:{username}:recent_plays      # 最近播放列表 (TTL: 10分钟)

# 收藏缓存
user:{username}:favorites         # 用户收藏Hash (TTL: 1小时)

# 搜索历史 (纯Redis)
user:{username}:search_history    # 搜索历史列表 (TTL: 7天)

# 会话管理
session:{sessionId}               # 会话数据 (TTL: 24小时)

# 管理员配置缓存
admin:config                      # 管理员配置 (TTL: 5分钟)

# 统计缓存
stats:play_summary                # 播放统计汇总 (TTL: 30分钟)
stats:content_hot                 # 热门内容 (TTL: 1小时)

# 卡密缓存
cardkey:{keyHash}                 # 卡密信息 (TTL: 1小时)
```

### 3.2 缓存策略

| 数据类型 | 缓存策略      | TTL    | 更新策略 |
| -------- | ------------- | ------ | -------- |
| 用户信息 | Cache-Aside   | 1小时  | 写穿透   |
| 播放记录 | Write-Through | 1小时  | 写穿透   |
| 收藏记录 | Cache-Aside   | 1小时  | 失效     |
| 搜索历史 | Redis-Only    | 7天    | 直接写   |
| 管理配置 | Cache-Aside   | 5分钟  | 失效     |
| 播放统计 | Read-Through  | 30分钟 | 定时刷新 |

## 4. 代码实现设计

### 4.1 文件结构

```
src/lib/
├── db.ts                    # 数据库管理器入口
├── mysql/
│   ├── connection.ts        # MySQL 连接池管理
│   ├── migrations/          # 数据库迁移脚本
│   │   └── 001_initial.sql
│   └── queries/             # SQL 查询封装
│       ├── users.ts
│       ├── playRecords.ts
│       ├── favorites.ts
│       ├── cardKeys.ts
│       └── ...
├── redis/
│   ├── connection.ts        # Redis 连接管理
│   └── cache.ts             # 缓存工具类
├── hybrid-storage.ts        # 混合存储实现
└── types.ts                 # 类型定义
```

### 4.2 HybridStorage 类设计

```typescript
// src/lib/hybrid-storage.ts

import { Pool } from 'mysql2/promise';
import { RedisClientType } from 'redis';
import { IStorage, PlayRecord, Favorite, CardKey /* ... */ } from './types';

export class HybridStorage implements IStorage {
  private mysql: Pool;
  private redis: RedisClientType;
  private cachePrefix = 'moontv:';

  constructor(mysqlPool: Pool, redisClient: RedisClientType) {
    this.mysql = mysqlPool;
    this.redis = redisClient;
  }

  // ==================== 播放记录 ====================

  async getPlayRecord(
    userName: string,
    key: string,
  ): Promise<PlayRecord | null> {
    // 1. 先查 Redis 缓存
    const cacheKey = `${this.cachePrefix}user:${userName}:play_records:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // 2. 查 MySQL
    const [source, id] = key.split('+');
    const [rows] = await this.mysql.execute<PlayRecordRow[]>(
      'SELECT * FROM play_records WHERE username = ? AND source = ? AND content_id = ?',
      [userName, source, id],
    );

    if (rows.length === 0) return null;

    const record = this.mapPlayRecordRow(rows[0]);

    // 3. 写入缓存
    await this.redis.setex(cacheKey, 3600, JSON.stringify(record));

    return record;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void> {
    const [source, id] = key.split('+');

    // 1. 写入 MySQL (UPSERT)
    await this.mysql.execute(
      `INSERT INTO play_records 
       (username, source, content_id, title, source_name, cover, year, 
        episode_index, total_episodes, play_time, total_time, search_title, 
        remarks, douban_id, content_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title), episode_index = VALUES(episode_index),
        play_time = VALUES(play_time), total_time = VALUES(total_time),
        updated_at = CURRENT_TIMESTAMP`,
      [
        userName,
        source,
        id,
        record.title,
        record.source_name,
        record.cover,
        record.year,
        record.index,
        record.total_episodes,
        record.play_time,
        record.total_time,
        record.search_title,
        record.remarks,
        record.douban_id,
        record.type,
      ],
    );

    // 2. 更新 Redis 缓存
    const cacheKey = `${this.cachePrefix}user:${userName}:play_records:${key}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(record));

    // 3. 删除用户播放记录列表缓存
    await this.redis.del(
      `${this.cachePrefix}user:${userName}:play_records:all`,
    );
  }

  // ==================== 用户管理 ====================

  async createUserV2(
    userName: string,
    password: string,
    role: 'owner' | 'admin' | 'user' = 'user',
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[],
    cardKey?: string,
    inviter?: string,
  ): Promise<void> {
    const hashedPassword = await this.hashPassword(password);
    const connection = await this.mysql.getConnection();

    try {
      await connection.beginTransaction();

      // 1. 创建用户
      await connection.execute(
        `INSERT INTO users (username, password_hash, role, tags, oidc_sub, enabled_apis)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userName,
          hashedPassword,
          role,
          JSON.stringify(tags || []),
          oidcSub,
          JSON.stringify(enabledApis || []),
        ],
      );

      // 2. 创建积分账户
      await connection.execute(
        `INSERT INTO user_points (username, invitation_code)
         VALUES (?, ?)`,
        [userName, this.generateInvitationCode()],
      );

      // 3. 处理卡密绑定
      if (cardKey) {
        // ... 卡密绑定逻辑
      }

      // 4. 处理邀请关系
      if (inviter) {
        // ... 邀请奖励逻辑
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ... 其他方法实现
}
```

### 4.3 MySQL 连接池配置

```typescript
// src/lib/mysql/connection.ts

import mysql, { Pool, PoolOptions } from 'mysql2/promise';

const poolConfig: PoolOptions = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'moontv',

  // 连接池配置
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,

  // 性能优化
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,

  // 字符集
  charset: 'utf8mb4',

  // 时区
  timezone: '+08:00',
};

let pool: Pool | null = null;

export function getMysqlPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
    console.log('[MySQL] Connection pool created');
  }
  return pool;
}

export async function closeMysqlPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[MySQL] Connection pool closed');
  }
}
```

## 5. 环境变量配置

```env
# 存储类型选择
NEXT_PUBLIC_STORAGE_TYPE=mysql-redis

# MySQL 配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=moontv
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=moontv

# Redis 配置 (用于缓存)
REDIS_URL=redis://localhost:6379
# 或者使用 Upstash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

## 6. 数据迁移方案

### 6.1 迁移脚本

```typescript
// scripts/migrate-redis-to-mysql.ts

import { createClient } from 'redis';
import { getMysqlPool } from '../src/lib/mysql/connection';

async function migrateData() {
  const redis = createClient({ url: process.env.REDIS_URL });
  await redis.connect();
  const mysql = getMysqlPool();

  console.log('Starting migration...');

  // 1. 迁移用户
  const userKeys = await redis.keys('u:*:info');
  for (const key of userKeys) {
    const userData = await redis.hGetAll(key);
    const username = key.match(/^u:(.+?):info$/)?.[1];

    if (username && userData.password) {
      await mysql.execute(
        `INSERT INTO users (username, password_hash, role, banned, tags, oidc_sub, created_at)
         VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?/1000))
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
        [
          username,
          userData.password,
          userData.role || 'user',
          userData.banned === 'true',
          userData.tags,
          userData.oidcSub,
          userData.created_at,
        ],
      );
      console.log(`Migrated user: ${username}`);
    }
  }

  // 2. 迁移播放记录
  const playRecordKeys = await redis.keys('u:*:pr:*');
  for (const key of playRecordKeys) {
    const match = key.match(/^u:(.+?):pr:(.+)\+(.+)$/);
    if (match) {
      const [, username, source, id] = match;
      const record = JSON.parse((await redis.get(key)) || '{}');

      await mysql.execute(
        `INSERT INTO play_records 
         (username, source, content_id, title, source_name, cover, year,
          episode_index, total_episodes, play_time, total_time, search_title,
          remarks, douban_id, content_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000))
         ON DUPLICATE KEY UPDATE play_time = VALUES(play_time), updated_at = VALUES(updated_at)`,
        [
          username,
          source,
          id,
          record.title,
          record.source_name,
          record.cover,
          record.year,
          record.index,
          record.total_episodes,
          record.play_time,
          record.total_time,
          record.search_title,
          record.remarks,
          record.douban_id,
          record.type,
          record.save_time,
          record.save_time,
        ],
      );
    }
  }

  // 3. 迁移收藏
  // ... 类似逻辑

  // 4. 迁移卡密
  // ... 类似逻辑

  console.log('Migration completed!');
  await redis.disconnect();
}

migrateData().catch(console.error);
```

## 7. 性能优化建议

### 7.1 MySQL 优化

1. **索引优化**：所有查询字段已添加索引
2. **分表策略**：播放记录表可按用户 ID 分表
3. **读写分离**：配置主从复制，读操作走从库
4. **连接池**：使用连接池复用连接

### 7.2 Redis 优化

1. **热点数据缓存**：活跃用户的播放记录、收藏列表
2. **缓存预热**：启动时预加载热门内容
3. **缓存穿透保护**：空结果缓存 1 分钟
4. **缓存雪崩保护**：TTL 添加随机偏移

### 7.3 查询优化

```sql
-- 分页查询优化
SELECT * FROM play_records
WHERE username = ?
ORDER BY updated_at DESC
LIMIT ? OFFSET ?;

-- 统计查询优化（使用物化视图思路）
CREATE TABLE play_stats_daily (
    stat_date DATE PRIMARY KEY,
    total_plays INT,
    total_watch_time BIGINT,
    unique_users INT
);
```

## 8. 监控与运维

### 8.1 健康检查

```typescript
// src/app/api/health/route.ts

export async function GET() {
  const health = {
    mysql: false,
    redis: false,
    timestamp: new Date().toISOString(),
  };

  try {
    const pool = getMysqlPool();
    await pool.execute('SELECT 1');
    health.mysql = true;
  } catch (e) {
    console.error('MySQL health check failed:', e);
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
    health.redis = true;
  } catch (e) {
    console.error('Redis health check failed:', e);
  }

  return Response.json(health);
}
```

### 8.2 慢查询监控

```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

## 9. 部署清单

### 9.1 依赖安装

```bash
# MySQL 客户端
pnpm add mysql2

# 如需类型支持
pnpm add -D @types/mysql2
```

### 9.2 数据库初始化

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE moontv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 创建用户
mysql -u root -p -e "CREATE USER 'moontv'@'%' IDENTIFIED BY 'your_password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON moontv.* TO 'moontv'@'%';"
mysql -u root -p -e "FLUSH PRIVILEGES;"

# 执行迁移
mysql -u moontv -p moontv < src/lib/mysql/migrations/001_initial.sql
```

## 10. 回滚方案

如果 MySQL 出现问题，可通过修改环境变量快速切换回纯 Redis 模式：

```env
NEXT_PUBLIC_STORAGE_TYPE=redis  # 或 upstash / kvrocks
```

系统会自动使用原有的 RedisStorage 实现，无需代码修改。

## 11. 总结

### 优势

1. **数据持久化**：MySQL 保证数据不丢失
2. **复杂查询**：支持 SQL 查询和聚合
3. **事务支持**：积分、卡密等关键操作有事务保证
4. **高性能**：Redis 缓存热点数据，响应速度快
5. **可扩展**：支持分库分表、读写分离

### 注意事项

1. 需要维护两套存储系统
2. 缓存一致性需要额外处理
3. 运维复杂度增加
4. 需要定期同步缓存和数据库
