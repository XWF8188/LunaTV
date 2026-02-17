#!/usr/bin/env node
/**
 * Redis to MySQL Migration Script
 *
 * This script migrates data from Redis to MySQL for the HybridStorage implementation.
 *
 * Usage:
 *   node scripts/migrate-redis-to-mysql.ts
 *
 * Environment variables required:
 *   - REDIS_URL: Redis connection URL
 *   - MYSQL_HOST: MySQL host (default: localhost)
 *   - MYSQL_PORT: MySQL port (default: 3306)
 *   - MYSQL_USER: MySQL user
 *   - MYSQL_PASSWORD: MySQL password
 *   - MYSQL_DATABASE: MySQL database name (default: moontv)
 */

import { createClient } from 'redis';
import mysql from 'mysql2/promise';

const CACHE_PREFIX = 'moontv:';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateInvitationCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function migrate() {
  console.log('=== Redis to MySQL Migration Script ===\n');

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('Error: REDIS_URL environment variable not set');
    process.exit(1);
  }

  const mysqlConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'moontv',
  };

  console.log('Connecting to Redis...');
  const redis = createClient({ url: redisUrl });
  await redis.connect();
  console.log('Redis connected.\n');

  console.log('Connecting to MySQL...');
  const mysqlConn = await mysql.createConnection(mysqlConfig);
  console.log('MySQL connected.\n');

  try {
    await migrateUsers(redis, mysqlConn);
    await migratePlayRecords(redis, mysqlConn);
    await migrateFavorites(redis, mysqlConn);
    await migrateCardKeys(redis, mysqlConn);
    await migrateAdminConfig(redis, mysqlConn);
    await migrateUserPoints(redis, mysqlConn);
    await migrateInvitations(redis, mysqlConn);

    console.log('\n=== Migration completed successfully! ===');
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  } finally {
    await redis.disconnect();
    await mysqlConn.end();
  }
}

async function migrateUsers(
  redis: ReturnType<typeof createClient>,
  mysql: mysql.Connection,
) {
  console.log('Migrating users...');

  const v1Keys = await redis.keys('u:*:pwd');
  const v2Keys = await redis.keys('u:*:info');

  console.log(
    `Found ${v1Keys.length} V1 users and ${v2Keys.length} V2 user info entries`,
  );

  let migrated = 0;

  for (const key of v2Keys) {
    const match = key.match(/^u:(.+?):info$/);
    if (!match) continue;

    const username = match[1];
    const userData = await redis.hGetAll(key);

    if (!userData || Object.keys(userData).length === 0) continue;

    try {
      await mysql.execute(
        `INSERT INTO users (username, password_hash, role, banned, tags, oidc_sub, enabled_apis, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?/1000))
         ON DUPLICATE KEY UPDATE 
           password_hash = VALUES(password_hash),
           role = VALUES(role),
           banned = VALUES(banned),
           tags = VALUES(tags),
           oidc_sub = VALUES(oidc_sub),
           enabled_apis = VALUES(enabled_apis)`,
        [
          username,
          userData.password || '',
          userData.role || 'user',
          userData.banned === 'true',
          userData.tags || null,
          userData.oidcSub || null,
          userData.enabledApis || null,
          userData.created_at || Date.now(),
        ],
      );

      await mysql.execute(
        `INSERT INTO user_points (username, invitation_code) 
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE invitation_code = VALUES(invitation_code)`,
        [username, generateInvitationCode()],
      );

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`  Migrated ${migrated} users...`);
      }
    } catch (error) {
      console.error(`  Failed to migrate user ${username}:`, error);
    }
  }

  for (const key of v1Keys) {
    const match = key.match(/^u:(.+?):pwd$/);
    if (!match) continue;

    const username = match[1];
    const password = await redis.get(key);

    if (!password) continue;

    const [existing] = await mysql.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [username],
    );

    if (existing.length > 0) continue;

    try {
      const hashedPassword = await hashPassword(password);

      await mysql.execute(
        `INSERT INTO users (username, password_hash, role, created_at)
         VALUES (?, ?, 'user', NOW())
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
        [username, hashedPassword],
      );

      await mysql.execute(
        `INSERT INTO user_points (username, invitation_code) 
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE invitation_code = VALUES(invitation_code)`,
        [username, generateInvitationCode()],
      );

      migrated++;
    } catch (error) {
      console.error(`  Failed to migrate V1 user ${username}:`, error);
    }
  }

  console.log(`Users migration completed: ${migrated} users migrated.\n`);
}

async function migratePlayRecords(
  redis: ReturnType<typeof createClient>,
  mysql: mysql.Connection,
) {
  console.log('Migrating play records...');

  const keys = await redis.keys('u:*:pr:*');
  console.log(`Found ${keys.length} play records`);

  let migrated = 0;

  for (const key of keys) {
    const match = key.match(/^u:(.+?):pr:(.+)\+(.+)$/);
    if (!match) continue;

    const [, username, source, contentId] = match;
    const data = await redis.get(key);

    if (!data) continue;

    try {
      const record = JSON.parse(data);

      await mysql.execute(
        `INSERT INTO play_records 
         (username, source, content_id, title, source_name, cover, year,
          episode_index, total_episodes, play_time, total_time, search_title,
          remarks, douban_id, content_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000))
         ON DUPLICATE KEY UPDATE 
           play_time = VALUES(play_time),
           episode_index = VALUES(episode_index),
           updated_at = VALUES(updated_at)`,
        [
          username,
          source,
          contentId,
          record.title || '',
          record.source_name || '',
          record.cover || null,
          record.year || null,
          record.index || 0,
          record.total_episodes || 0,
          record.play_time || 0,
          record.total_time || 0,
          record.search_title || null,
          record.remarks || null,
          record.douban_id || null,
          record.type || null,
          record.save_time || Date.now(),
          record.save_time || Date.now(),
        ],
      );

      migrated++;
      if (migrated % 500 === 0) {
        console.log(`  Migrated ${migrated} play records...`);
      }
    } catch (error) {
      console.error(`  Failed to migrate play record ${key}:`, error);
    }
  }

  console.log(
    `Play records migration completed: ${migrated} records migrated.\n`,
  );
}

async function migrateFavorites(
  redis: ReturnType<typeof createClient>,
  mysql: mysql.Connection,
) {
  console.log('Migrating favorites...');

  const keys = await redis.keys('u:*:fav:*');
  console.log(`Found ${keys.length} favorites`);

  let migrated = 0;

  for (const key of keys) {
    const match = key.match(/^u:(.+?):fav:(.+)\+(.+)$/);
    if (!match) continue;

    const [, username, source, contentId] = match;
    const data = await redis.get(key);

    if (!data) continue;

    try {
      const favorite = JSON.parse(data);

      await mysql.execute(
        `INSERT INTO favorites 
         (username, source, content_id, title, source_name, cover, year,
          total_episodes, search_title, origin, content_type, release_date, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        [
          username,
          source,
          contentId,
          favorite.title || '',
          favorite.source_name || '',
          favorite.cover || null,
          favorite.year || null,
          favorite.total_episodes || null,
          favorite.search_title || null,
          favorite.origin || null,
          favorite.type || null,
          favorite.releaseDate || null,
          favorite.remarks || null,
        ],
      );

      migrated++;
      if (migrated % 500 === 0) {
        console.log(`  Migrated ${migrated} favorites...`);
      }
    } catch (error) {
      console.error(`  Failed to migrate favorite ${key}:`, error);
    }
  }

  console.log(
    `Favorites migration completed: ${migrated} favorites migrated.\n`,
  );
}

async function migrateCardKeys(
  redis: ReturnType<typeof createClient>,
  mysql: mysql.Connection,
) {
  console.log('Migrating card keys...');

  const keys = await redis.keys('cardkey:hash:*');
  console.log(`Found ${keys.length} card keys`);

  let migrated = 0;

  for (const key of keys) {
    const data = await redis.get(key);

    if (!data) continue;

    try {
      const cardKey = typeof data === 'string' ? JSON.parse(data) : data;

      await mysql.execute(
        `INSERT INTO card_keys (key_hash, plain_key, key_type, status, created_at, expires_at, bound_to, bound_at)
         VALUES (?, ?, ?, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000), ?, ?)
         ON DUPLICATE KEY UPDATE 
           status = VALUES(status),
           bound_to = VALUES(bound_to),
           expires_at = VALUES(expires_at)`,
        [
          cardKey.keyHash,
          cardKey.key,
          cardKey.keyType || 'week',
          cardKey.status || 'unused',
          cardKey.createdAt || Date.now(),
          cardKey.expiresAt || Date.now() + 365 * 24 * 60 * 60 * 1000,
          cardKey.boundTo || null,
          cardKey.boundAt ? new Date(cardKey.boundAt) : null,
        ],
      );

      migrated++;
    } catch (error) {
      console.error(`  Failed to migrate card key ${key}:`, error);
    }
  }

  console.log(
    `Card keys migration completed: ${migrated} card keys migrated.\n`,
  );
}

async function migrateAdminConfig(
  redis: ReturnType<typeof createClient>,
  mysql: mysql.Connection,
) {
  console.log('Migrating admin config...');

  const data = await redis.get('admin:config');

  if (data) {
    try {
      const config = typeof data === 'string' ? JSON.parse(data) : data;

      await mysql.execute(
        `INSERT INTO admin_configs (id, config_key, config_value) 
         VALUES (1, 'main_config', ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [JSON.stringify(config)],
      );

      console.log('Admin config migrated.\n');
    } catch (error) {
      console.error('Failed to migrate admin config:', error);
    }
  } else {
    console.log('No admin config found to migrate.\n');
  }
}

async function migrateUserPoints(
  redis: ReturnType<typeof createClient>,
  mysql: mysql.Connection,
) {
  console.log('Migrating user points...');

  const keys = await redis.keys('user:points:*');
  console.log(`Found ${keys.length} user points entries`);

  let migrated = 0;

  for (const key of keys) {
    const match = key.match(/^user:points:(.+)$/);
    if (!match) continue;

    const username = match[1];
    const data = await redis.get(key);

    if (!data) continue;

    try {
      const points = typeof data === 'string' ? JSON.parse(data) : data;

      await mysql.execute(
        `UPDATE user_points 
         SET balance = ?, total_earned = ?, total_redeemed = ?, invitation_code = ?
         WHERE username = ?`,
        [
          points.balance || 0,
          points.totalEarned || 0,
          points.totalRedeemed || 0,
          points.invitationCode || generateInvitationCode(),
          username,
        ],
      );

      migrated++;
    } catch (error) {
      console.error(`  Failed to migrate user points ${key}:`, error);
    }
  }

  console.log(
    `User points migration completed: ${migrated} entries migrated.\n`,
  );
}

async function migrateInvitations(
  redis: ReturnType<typeof createClient>,
  mysql: mysql.Connection,
) {
  console.log('Migrating invitations...');

  const keys = await redis.keys('invitation:invitee:*');
  console.log(`Found ${keys.length} invitations`);

  let migrated = 0;

  for (const key of keys) {
    const match = key.match(/^invitation:invitee:(.+)$/);
    if (!match) continue;

    const invitee = match[1];
    const data = await redis.get(key);

    if (!data) continue;

    try {
      const invitation = typeof data === 'string' ? JSON.parse(data) : data;

      await mysql.execute(
        `INSERT INTO invitations (id, inviter, invitee, invitation_code, ip_address, rewarded, reward_time, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?/1000))
         ON DUPLICATE KEY UPDATE rewarded = VALUES(rewarded)`,
        [
          invitation.id || generateUUID(),
          invitation.inviter,
          invitation.invitee,
          invitation.invitationCode || '',
          invitation.ipAddress || '',
          invitation.rewarded || false,
          invitation.rewardTime ? new Date(invitation.rewardTime) : null,
          invitation.createdAt || Date.now(),
        ],
      );

      migrated++;
    } catch (error) {
      console.error(`  Failed to migrate invitation ${key}:`, error);
    }
  }

  console.log(
    `Invitations migration completed: ${migrated} invitations migrated.\n`,
  );
}

migrate().catch(console.error);
