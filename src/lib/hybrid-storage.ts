import { PoolConnection } from 'mysql2/promise';
import { createClient } from 'redis';

import { AdminConfig, UserCardKeyData } from './admin.types';
import {
  CardKey,
  ContentStat,
  EpisodeSkipConfig,
  Favorite,
  IStorage,
  Invitation,
  InvitationConfig,
  IPRewardRecord,
  PlayRecord,
  PlayStatsResult,
  PointsRecord,
  UserCardKey,
  UserCardKeyInfo,
  UserPlayStat,
  UserPoints,
} from './types';
import {
  getMysqlPool,
  withTransaction,
  executeQuery,
  executeUpdate,
} from './mysql/connection';
import * as userQueries from './mysql/queries/users';
import * as playRecordQueries from './mysql/queries/playRecords';
import * as favoriteQueries from './mysql/queries/favorites';
import * as cardKeyQueries from './mysql/queries/cardKeys';
import * as pointsQueries from './mysql/queries/points';
import * as invitationQueries from './mysql/queries/invitations';
import * as configQueries from './mysql/queries/config';
import * as statsQueries from './mysql/queries/stats';
import { incrementDbQuery } from './performance-monitor';

const SEARCH_HISTORY_LIMIT = 20;
const CACHE_PREFIX = 'moontv:';

const GLOBAL_REDIS_SYMBOL = Symbol.for('__MOONTV_HYBRID_REDIS_CLIENT__');

function getRedisClient(): ReturnType<typeof createClient> {
  if ((global as any)[GLOBAL_REDIS_SYMBOL]) {
    return (global as any)[GLOBAL_REDIS_SYMBOL];
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable not set');
  }

  const client = createClient({ url: redisUrl });

  client.on('error', (err) => console.error('[Redis] Client error:', err));
  client.on('connect', () => console.log('[Redis] Connected'));
  client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

  client.connect().catch((err) => {
    console.error('[Redis] Connection failed:', err);
  });

  (global as any)[GLOBAL_REDIS_SYMBOL] = client;
  return client;
}

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

export class HybridStorage implements IStorage {
  private redisClient: ReturnType<typeof createClient>;

  constructor() {
    this.redisClient = getRedisClient();
  }

  private buildCacheKey(key: string): string {
    return `${CACHE_PREFIX}${key}`;
  }

  private async fetchCache<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisClient.get(this.buildCacheKey(key));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async storeCache(
    key: string,
    data: unknown,
    ttlSeconds?: number,
  ): Promise<void> {
    const value = JSON.stringify(data);
    const cacheKey = this.buildCacheKey(key);
    if (ttlSeconds) {
      await this.redisClient.setEx(cacheKey, ttlSeconds, value);
    } else {
      await this.redisClient.set(cacheKey, value);
    }
  }

  private async removeCache(key: string): Promise<void> {
    await this.redisClient.del(this.buildCacheKey(key));
  }

  private async invalidateUserCache(username: string): Promise<void> {
    await Promise.all([
      this.removeCache(`user:${username}:info`),
      this.removeCache(`user:${username}:play_records`),
      this.removeCache(`user:${username}:favorites`),
    ]);
  }

  // ==================== 播放记录 ====================

  async getPlayRecord(
    userName: string,
    key: string,
  ): Promise<PlayRecord | null> {
    incrementDbQuery();

    const cacheKey = `user:${userName}:play_record:${key}`;
    const cached = await this.fetchCache<PlayRecord>(cacheKey);
    if (cached) return cached;

    const [source, id] = key.split('+');
    const row = await playRecordQueries.getPlayRecord(userName, source, id);
    if (!row) return null;

    const record = playRecordQueries.mapPlayRecordRowToPlayRecord(row);
    await this.storeCache(cacheKey, record, 3600);
    return record;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void> {
    incrementDbQuery();

    const [source, id] = key.split('+');
    await playRecordQueries.upsertPlayRecord(userName, source, id, record);

    const cacheKey = `user:${userName}:play_record:${key}`;
    await this.storeCache(cacheKey, record, 3600);
    await this.removeCache(`user:${userName}:play_records`);
  }

  async getAllPlayRecords(
    userName: string,
  ): Promise<{ [key: string]: PlayRecord }> {
    incrementDbQuery();

    const cacheKey = `user:${userName}:play_records`;
    const cached = await this.fetchCache<{ [key: string]: PlayRecord }>(
      cacheKey,
    );
    if (cached) return cached;

    const rows = await playRecordQueries.getAllPlayRecords(userName);
    const result: { [key: string]: PlayRecord } = {};

    for (const row of rows) {
      const key = `${row.source}+${row.content_id}`;
      result[key] = playRecordQueries.mapPlayRecordRowToPlayRecord(row);
    }

    await this.storeCache(cacheKey, result, 3600);
    return result;
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    incrementDbQuery();

    const [source, id] = key.split('+');
    await playRecordQueries.deletePlayRecord(userName, source, id);
    await this.invalidateUserCache(userName);
  }

  async setPlayRecordsBatch(
    userName: string,
    records: { [key: string]: PlayRecord },
  ): Promise<void> {
    incrementDbQuery();

    for (const [key, record] of Object.entries(records)) {
      const [source, id] = key.split('+');
      await playRecordQueries.upsertPlayRecord(userName, source, id, record);
    }

    await this.removeCache(`user:${userName}:play_records`);
  }

  // ==================== 收藏 ====================

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    incrementDbQuery();

    const [source, id] = key.split('+');
    const row = await favoriteQueries.getFavorite(userName, source, id);
    return row ? favoriteQueries.mapFavoriteRowToFavorite(row) : null;
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite,
  ): Promise<void> {
    incrementDbQuery();

    const [source, id] = key.split('+');
    await favoriteQueries.upsertFavorite(userName, source, id, favorite);
    await this.removeCache(`user:${userName}:favorites`);
  }

  async getAllFavorites(
    userName: string,
  ): Promise<{ [key: string]: Favorite }> {
    incrementDbQuery();

    const cacheKey = `user:${userName}:favorites`;
    const cached = await this.fetchCache<{ [key: string]: Favorite }>(cacheKey);
    if (cached) return cached;

    const rows = await favoriteQueries.getAllFavorites(userName);
    const result: { [key: string]: Favorite } = {};

    for (const row of rows) {
      const key = `${row.source}+${row.content_id}`;
      result[key] = favoriteQueries.mapFavoriteRowToFavorite(row);
    }

    await this.storeCache(cacheKey, result, 3600);
    return result;
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    incrementDbQuery();

    const [source, id] = key.split('+');
    await favoriteQueries.deleteFavorite(userName, source, id);
    await this.removeCache(`user:${userName}:favorites`);
  }

  async setFavoritesBatch(
    userName: string,
    favorites: { [key: string]: Favorite },
  ): Promise<void> {
    incrementDbQuery();

    for (const [key, favorite] of Object.entries(favorites)) {
      const [source, id] = key.split('+');
      await favoriteQueries.upsertFavorite(userName, source, id, favorite);
    }

    await this.removeCache(`user:${userName}:favorites`);
  }

  // ==================== 用户管理 ====================

  async registerUser(userName: string, password: string): Promise<void> {
    incrementDbQuery();
    const passwordHash = await hashPassword(password);
    await userQueries.createUser(userName, passwordHash, 'user');
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    incrementDbQuery();
    const user = await userQueries.getUserByUsername(userName);
    if (!user) return false;

    const passwordHash = await hashPassword(password);
    return user.password_hash === passwordHash;
  }

  async checkUserExist(userName: string): Promise<boolean> {
    incrementDbQuery();
    return userQueries.checkUserExists(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    incrementDbQuery();
    const passwordHash = await hashPassword(newPassword);
    await userQueries.updateUserPassword(userName, passwordHash);
  }

  async deleteUser(userName: string): Promise<void> {
    incrementDbQuery();
    await userQueries.deleteUser(userName);
    await this.invalidateUserCache(userName);
  }

  // ==================== 用户 V2 (支持 OIDC) ====================

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
    incrementDbQuery();

    const passwordHash = await hashPassword(password);
    const invitationCode = generateInvitationCode();

    await withTransaction(async (connection) => {
      await connection.execute(
        `INSERT INTO users (username, password_hash, role, tags, oidc_sub, enabled_apis)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userName,
          passwordHash,
          role,
          tags ? JSON.stringify(tags) : null,
          oidcSub || null,
          enabledApis ? JSON.stringify(enabledApis) : null,
        ],
      );

      await connection.execute(
        'INSERT INTO user_points (username, invitation_code) VALUES (?, ?)',
        [userName, invitationCode],
      );
    });

    if (cardKey) {
      try {
        const { cardKeyService } = await import('./cardkey');
        const result = await cardKeyService.bindCardKeyToUser(
          cardKey,
          userName,
        );
        if (!result.success) {
          throw new Error(result.error || 'Card key binding failed');
        }
      } catch (error) {
        console.error('Failed to bind card key:', error);
        throw error;
      }
    }
  }

  async verifyUserV2(userName: string, password: string): Promise<boolean> {
    incrementDbQuery();
    const user = await userQueries.getUserByUsername(userName);
    if (!user) return false;

    const passwordHash = await hashPassword(password);
    return user.password_hash === passwordHash;
  }

  async checkUserExistV2(userName: string): Promise<boolean> {
    incrementDbQuery();
    return userQueries.checkUserExists(userName);
  }

  async getUserByOidcSub(oidcSub: string): Promise<string | null> {
    incrementDbQuery();
    const user = await userQueries.getUserByOidcSub(oidcSub);
    return user ? user.username : null;
  }

  async getUserInfoV2(userName: string): Promise<{
    username: string;
    role: 'owner' | 'admin' | 'user';
    tags?: string[];
    enabledApis?: string[];
    banned?: boolean;
    createdAt?: number;
    oidcSub?: string;
  } | null> {
    incrementDbQuery();

    const user = await userQueries.getUserByUsername(userName);
    if (!user) return null;

    return {
      username: user.username,
      role: user.role,
      banned: user.banned,
      tags: user.tags ? JSON.parse(user.tags) : undefined,
      enabledApis: user.enabled_apis
        ? JSON.parse(user.enabled_apis)
        : undefined,
      oidcSub: user.oidc_sub || undefined,
      createdAt: Math.floor(new Date(user.created_at).getTime()),
    };
  }

  // ==================== 搜索历史 (纯 Redis) ====================

  private searchHistoryKey(userName: string): string {
    return `${CACHE_PREFIX}user:${userName}:search_history`;
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    incrementDbQuery();
    const key = this.searchHistoryKey(userName);
    const result = await this.redisClient.lRange(key, 0, -1);
    return result;
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    incrementDbQuery();
    const key = this.searchHistoryKey(userName);
    await this.redisClient.lRem(key, 0, keyword);
    await this.redisClient.lPush(key, keyword);
    await this.redisClient.lTrim(key, 0, SEARCH_HISTORY_LIMIT - 1);
    await this.redisClient.expire(key, 7 * 24 * 60 * 60);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    incrementDbQuery();
    const key = this.searchHistoryKey(userName);
    if (keyword) {
      await this.redisClient.lRem(key, 0, keyword);
    } else {
      await this.redisClient.del(key);
    }
  }

  // ==================== 用户列表 ====================

  async getAllUsers(): Promise<string[]> {
    incrementDbQuery();
    const users = await userQueries.getAllUsers();
    return users.map((u) => u.username);
  }

  // ==================== 管理员配置 ====================

  async getAdminConfig(): Promise<AdminConfig | null> {
    incrementDbQuery();

    const cacheKey = 'admin:config';
    const cached = await this.fetchCache<AdminConfig>(cacheKey);
    if (cached) return cached;

    const config = await configQueries.getAdminConfig();
    if (config) {
      await this.storeCache(cacheKey, config, 300);
    }
    return config;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    incrementDbQuery();
    await configQueries.setAdminConfig(config);
    await this.removeCache('admin:config');
  }

  // ==================== 跳过配置 ====================

  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<EpisodeSkipConfig | null> {
    incrementDbQuery();
    const rows = await executeQuery<{
      source: string;
      content_id: string;
      title: string;
      segments: string;
    }>(
      'SELECT * FROM episode_skip_configs WHERE username = ? AND source = ? AND content_id = ?',
      [userName, source, id],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      source: row.source,
      id: row.content_id,
      title: row.title,
      segments: JSON.parse(row.segments),
      updated_time: Date.now(),
    };
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: EpisodeSkipConfig,
  ): Promise<void> {
    incrementDbQuery();
    await executeUpdate(
      `INSERT INTO episode_skip_configs (username, source, content_id, title, segments)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), segments = VALUES(segments)`,
      [userName, source, id, config.title, JSON.stringify(config.segments)],
    );
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    incrementDbQuery();
    await executeUpdate(
      'DELETE FROM episode_skip_configs WHERE username = ? AND source = ? AND content_id = ?',
      [userName, source, id],
    );
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: EpisodeSkipConfig }> {
    incrementDbQuery();
    const rows = await executeQuery<{
      source: string;
      content_id: string;
      title: string;
      segments: string;
    }>(
      'SELECT source, content_id, title, segments FROM episode_skip_configs WHERE username = ?',
      [userName],
    );

    const result: { [key: string]: EpisodeSkipConfig } = {};
    for (const row of rows) {
      const key = `${row.source}+${row.content_id}`;
      result[key] = {
        source: row.source,
        id: row.content_id,
        title: row.title,
        segments: JSON.parse(row.segments),
        updated_time: Date.now(),
      };
    }
    return result;
  }

  async getEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<EpisodeSkipConfig | null> {
    return this.getSkipConfig(userName, source, id);
  }

  async saveEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: EpisodeSkipConfig,
  ): Promise<void> {
    return this.setSkipConfig(userName, source, id, config);
  }

  async deleteEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    return this.deleteSkipConfig(userName, source, id);
  }

  async getAllEpisodeSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: EpisodeSkipConfig }> {
    return this.getAllSkipConfigs(userName);
  }

  // ==================== 数据清理 ====================

  async clearAllData(): Promise<void> {
    incrementDbQuery();
    await executeUpdate('DELETE FROM users');
    await executeUpdate('DELETE FROM card_keys');
    await executeUpdate('DELETE FROM admin_configs');
  }

  // ==================== 通用缓存 ====================

  async getCache(key: string): Promise<unknown | null> {
    return this.fetchCache(`generic:${key}`);
  }

  async setCache(
    key: string,
    data: unknown,
    expireSeconds?: number,
  ): Promise<void> {
    await this.storeCache(`generic:${key}`, data, expireSeconds);
  }

  async deleteCache(key: string): Promise<void> {
    await this.removeCache(`generic:${key}`);
  }

  async clearExpiredCache(prefix?: string): Promise<void> {
    const pattern = prefix
      ? `${CACHE_PREFIX}generic:${prefix}*`
      : `${CACHE_PREFIX}generic:*`;
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
  }

  // ==================== 播放统计 ====================

  async getPlayStats(): Promise<PlayStatsResult> {
    incrementDbQuery();

    const cacheKey = 'stats:play_summary';
    const cached = await this.fetchCache<PlayStatsResult>(cacheKey);
    if (cached) return cached;

    const users = await userQueries.getAllUsers();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const userStats = [];
    let totalWatchTime = 0;
    let totalPlays = 0;

    for (const user of users) {
      const stat = await this.getUserPlayStat(user.username);
      userStats.push({
        username: user.username,
        totalWatchTime: stat.totalWatchTime,
        totalPlays: stat.totalPlays,
        lastPlayTime: stat.lastPlayTime,
        recentRecords: stat.recentRecords,
        avgWatchTime: stat.avgWatchTime,
        mostWatchedSource: stat.mostWatchedSource,
        registrationDays:
          Math.floor(
            (now - (stat.firstWatchDate || now)) / (1000 * 60 * 60 * 24),
          ) + 1,
        lastLoginTime: stat.lastLoginTime || 0,
        loginCount: stat.loginCount || 0,
        createdAt: stat.firstWatchDate || now,
      });
      totalWatchTime += stat.totalWatchTime;
      totalPlays += stat.totalPlays;
    }

    userStats.sort((a, b) => b.totalWatchTime - a.totalWatchTime);

    const result: PlayStatsResult = {
      totalUsers: users.length,
      totalWatchTime,
      totalPlays,
      avgWatchTimePerUser: users.length > 0 ? totalWatchTime / users.length : 0,
      avgPlaysPerUser: users.length > 0 ? totalPlays / users.length : 0,
      userStats,
      topSources: [],
      dailyStats: [],
      registrationStats: {
        todayNewUsers: users.filter(
          (u) => new Date(u.created_at).getTime() >= oneDayAgo,
        ).length,
        totalRegisteredUsers: users.length,
        registrationTrend: [],
      },
      activeUsers: {
        daily: userStats.filter((u) => u.lastLoginTime >= oneDayAgo).length,
        weekly: userStats.filter((u) => u.lastLoginTime >= sevenDaysAgo).length,
        monthly: userStats.filter((u) => u.lastLoginTime >= thirtyDaysAgo)
          .length,
      },
    };

    await this.storeCache(cacheKey, result, 1800);
    return result;
  }

  async getUserPlayStat(userName: string): Promise<UserPlayStat> {
    incrementDbQuery();

    const rows = await playRecordQueries.getAllPlayRecords(userName);
    const records = rows.map(playRecordQueries.mapPlayRecordRowToPlayRecord);

    if (records.length === 0) {
      const loginStats = await statsQueries.getUserLoginStats(userName);
      return {
        username: userName,
        totalWatchTime: 0,
        totalPlays: 0,
        lastPlayTime: 0,
        recentRecords: [],
        avgWatchTime: 0,
        mostWatchedSource: '',
        totalMovies: 0,
        firstWatchDate: Date.now(),
        lastUpdateTime: Date.now(),
        loginCount: loginStats?.login_count || 0,
        firstLoginTime: loginStats?.first_login_at
          ? Math.floor(new Date(loginStats.first_login_at).getTime())
          : 0,
        lastLoginTime: loginStats?.last_login_at
          ? Math.floor(new Date(loginStats.last_login_at).getTime())
          : 0,
        lastLoginDate: loginStats?.last_login_date?.getTime() || 0,
      };
    }

    const totalWatchTime = records.reduce((sum, r) => sum + r.play_time, 0);
    const lastPlayTime = Math.max(...records.map((r) => r.save_time || 0));
    const firstWatchDate = Math.min(
      ...records.map((r) => r.save_time || Date.now()),
    );
    const totalMovies = new Set(
      records.map((r) => `${r.title}_${r.source_name}`),
    ).size;

    const sourceMap = new Map<string, number>();
    records.forEach((r) => {
      sourceMap.set(r.source_name, (sourceMap.get(r.source_name) || 0) + 1);
    });
    const mostWatchedSource =
      Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const loginStats = await statsQueries.getUserLoginStats(userName);

    return {
      username: userName,
      totalWatchTime,
      totalPlays: records.length,
      lastPlayTime,
      recentRecords: records
        .sort((a, b) => b.save_time - a.save_time)
        .slice(0, 10),
      avgWatchTime: records.length > 0 ? totalWatchTime / records.length : 0,
      mostWatchedSource,
      totalMovies,
      firstWatchDate,
      lastUpdateTime: Date.now(),
      loginCount: loginStats?.login_count || 0,
      firstLoginTime: loginStats?.first_login_at
        ? Math.floor(new Date(loginStats.first_login_at).getTime())
        : 0,
      lastLoginTime: loginStats?.last_login_at
        ? Math.floor(new Date(loginStats.last_login_at).getTime())
        : 0,
      lastLoginDate: loginStats?.last_login_date?.getTime() || 0,
    };
  }

  async getContentStats(limit: number = 10): Promise<ContentStat[]> {
    incrementDbQuery();
    const rows = await executeQuery<ContentStat>(
      'SELECT * FROM content_stats ORDER BY play_count DESC LIMIT ?',
      [limit],
    );
    return rows;
  }

  async updatePlayStatistics(
    _userName: string,
    _source: string,
    _id: string,
    _watchTime: number,
  ): Promise<void> {
    incrementDbQuery();
    await this.removeCache('stats:play_summary');
  }

  async updateUserLoginStats(
    userName: string,
    loginTime: number,
    isFirstLogin?: boolean,
  ): Promise<void> {
    incrementDbQuery();
    await statsQueries.updateUserLoginStats(userName, loginTime, isFirstLogin);
  }

  // ==================== 卡密系统 ====================

  async createCardKey(cardKey: CardKey): Promise<void> {
    incrementDbQuery();
    await cardKeyQueries.createCardKey(cardKey);
  }

  async getCardKey(keyHash: string): Promise<CardKey | null> {
    incrementDbQuery();
    const row = await cardKeyQueries.getCardKey(keyHash);
    return row ? cardKeyQueries.mapCardKeyRowToCardKey(row) : null;
  }

  async getAllCardKeys(): Promise<CardKey[]> {
    incrementDbQuery();
    const rows = await cardKeyQueries.getAllCardKeys();
    return rows.map(cardKeyQueries.mapCardKeyRowToCardKey);
  }

  async updateCardKey(
    keyHash: string,
    updates: Partial<CardKey>,
  ): Promise<void> {
    incrementDbQuery();
    await cardKeyQueries.updateCardKey(keyHash, updates);
  }

  async deleteCardKey(keyHash: string): Promise<void> {
    incrementDbQuery();
    await cardKeyQueries.deleteCardKey(keyHash);
  }

  async getUserCardKeyInfo(userName: string): Promise<UserCardKeyData | null> {
    incrementDbQuery();
    const config = await this.getAdminConfig();
    if (!config) return null;

    const user = config.UserConfig.Users.find((u) => u.username === userName);
    return user?.cardKey || null;
  }

  async updateUserCardKeyInfo(
    userName: string,
    info: UserCardKeyData,
  ): Promise<void> {
    incrementDbQuery();
    const config = await this.getAdminConfig();
    if (!config) return;

    const userIndex = config.UserConfig.Users.findIndex(
      (u) => u.username === userName,
    );
    if (userIndex === -1) return;

    config.UserConfig.Users[userIndex].cardKey = info;
    await this.setAdminConfig(config);
  }

  async getUserCardKey(userName: string): Promise<UserCardKeyInfo | null> {
    incrementDbQuery();
    const activeKey = await statsQueries.getActiveUserCardKey(userName);
    if (!activeKey) return null;

    const now = Date.now();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(activeKey.expires_at).getTime() - now) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return {
      boundKey: activeKey.key_hash,
      expiresAt: new Date(activeKey.expires_at).getTime(),
      boundAt: new Date(activeKey.created_at).getTime(),
      daysRemaining,
      isExpiring: daysRemaining <= 30,
      isExpired: daysRemaining <= 0,
    };
  }

  // ==================== 积分系统 ====================

  async getUserPoints(userName: string): Promise<UserPoints | null> {
    incrementDbQuery();
    const row = await pointsQueries.getUserPoints(userName);
    return row ? pointsQueries.mapUserPointsRowToUserPoints(row) : null;
  }

  async updateUserPoints(points: UserPoints): Promise<void> {
    incrementDbQuery();
    await pointsQueries.setUserPoints(points);
  }

  async addPointsRecord(record: PointsRecord): Promise<void> {
    incrementDbQuery();
    await pointsQueries.addPointsRecord(record);
  }

  async getPointsHistory(
    userName: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PointsRecord[]> {
    incrementDbQuery();
    const rows = await pointsQueries.getPointsHistory(userName, page, pageSize);
    return rows.map(pointsQueries.mapPointsRecordRowToPointsRecord);
  }

  // ==================== 邀请系统 ====================

  async getInvitationByInvitee(invitee: string): Promise<Invitation | null> {
    incrementDbQuery();
    const row = await invitationQueries.getInvitationByInvitee(invitee);
    return row ? invitationQueries.mapInvitationRowToInvitation(row) : null;
  }

  async getInvitationsByInviter(inviter: string): Promise<Invitation[]> {
    incrementDbQuery();
    const rows = await invitationQueries.getInvitationsByInviter(inviter);
    return rows.map(invitationQueries.mapInvitationRowToInvitation);
  }

  async createInvitation(invitation: Invitation): Promise<void> {
    incrementDbQuery();
    await invitationQueries.createInvitation(invitation);
  }

  async updateInvitation(
    id: string,
    updates: Partial<Invitation>,
  ): Promise<void> {
    incrementDbQuery();
    await invitationQueries.updateInvitation(id, updates);
  }

  async getIPRewardRecord(ipAddress: string): Promise<IPRewardRecord | null> {
    incrementDbQuery();
    const row = await invitationQueries.getIPRewardRecord(ipAddress);
    return row
      ? invitationQueries.mapIPRewardRecordRowToIPRewardRecord(row)
      : null;
  }

  async createIPRewardRecord(record: IPRewardRecord): Promise<void> {
    incrementDbQuery();
    await invitationQueries.createIPRewardRecord(record);
  }

  async getInvitationConfig(): Promise<InvitationConfig | null> {
    incrementDbQuery();
    const row = await invitationQueries.getInvitationConfig();
    if (!row) {
      return {
        enabled: true,
        rewardPoints: 100,
        redeemThreshold: 500,
        cardKeyType: 'week',
        updatedAt: Date.now(),
      };
    }
    return invitationQueries.mapInvitationConfigRowToInvitationConfig(row);
  }

  async setInvitationConfig(config: InvitationConfig): Promise<void> {
    incrementDbQuery();
    await invitationQueries.setInvitationConfig(config);
  }

  async getUserCardKeys(userName: string): Promise<UserCardKey[]> {
    incrementDbQuery();
    const rows = await statsQueries.getUserCardKeys(userName);
    return rows.map(statsQueries.mapUserCardKeyRowToUserCardKey);
  }

  async addUserCardKey(cardKey: UserCardKey): Promise<void> {
    incrementDbQuery();
    await statsQueries.createUserCardKey(cardKey);
  }

  async updateUserCardKey(
    id: string,
    updates: Partial<UserCardKey>,
  ): Promise<void> {
    incrementDbQuery();
    await statsQueries.updateUserCardKey(id, updates);
  }
}
