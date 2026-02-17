/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig, UserCardKeyData } from './admin.types';
import { HybridStorage } from './hybrid-storage';
import { KvrocksStorage } from './kvrocks.db';
import { RedisStorage } from './redis.db';
import {
  CardKey,
  ContentStat,
  EpisodeSkipConfig,
  Favorite,
  IStorage,
  PlayRecord,
  PlayStatsResult,
  UserCardKeyInfo,
  UserPlayStat,
} from './types';
import { UpstashRedisStorage } from './upstash.db';
import { incrementDbQuery } from './performance-monitor';

const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | 'mysql-redis'
    | undefined) || 'localstorage';

function createStorage(): IStorage {
  switch (STORAGE_TYPE) {
    case 'redis':
      return new RedisStorage();
    case 'upstash':
      return new UpstashRedisStorage();
    case 'kvrocks':
      return new KvrocksStorage();
    case 'mysql-redis':
      return new HybridStorage();
    case 'localstorage':
    default:
      return null as unknown as IStorage;
  }
}

// 单例存储实例
let storageInstance: IStorage | null = null;

function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// 导出便捷方法
export class DbManager {
  private storage: IStorage;

  constructor() {
    this.storage = getStorage();
  }

  // 播放记录相关方法
  async getPlayRecord(
    userName: string,
    source: string,
    id: string,
  ): Promise<PlayRecord | null> {
    incrementDbQuery();
    const key = generateStorageKey(source, id);
    return this.storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord,
  ): Promise<void> {
    incrementDbQuery();
    const key = generateStorageKey(source, id);
    await this.storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    incrementDbQuery();
    return this.storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    incrementDbQuery();
    const key = generateStorageKey(source, id);
    await this.storage.deletePlayRecord(userName, key);
  }

  // 🚀 批量保存播放记录（Upstash 优化，使用 mset 只算1条命令）
  async savePlayRecordsBatch(
    userName: string,
    records: Array<{ source: string; id: string; record: PlayRecord }>,
  ): Promise<void> {
    if (records.length === 0) return;

    // 检查 storage 是否支持批量操作
    if (typeof this.storage.setPlayRecordsBatch === 'function') {
      incrementDbQuery();
      const batchData: { [key: string]: PlayRecord } = {};
      for (const { source, id, record } of records) {
        const key = generateStorageKey(source, id);
        batchData[key] = record;
      }
      await this.storage.setPlayRecordsBatch(userName, batchData);
    } else {
      // 回退：逐条保存
      for (const { source, id, record } of records) {
        await this.savePlayRecord(userName, source, id, record);
      }
    }
  }

  // 收藏相关方法
  async getFavorite(
    userName: string,
    source: string,
    id: string,
  ): Promise<Favorite | null> {
    incrementDbQuery();
    const key = generateStorageKey(source, id);
    return this.storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite,
  ): Promise<void> {
    incrementDbQuery();
    const key = generateStorageKey(source, id);
    await this.storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string,
  ): Promise<{ [key: string]: Favorite }> {
    incrementDbQuery();
    return this.storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    incrementDbQuery();
    const key = generateStorageKey(source, id);
    await this.storage.deleteFavorite(userName, key);
  }

  // 🚀 批量保存收藏（Upstash 优化，使用 mset 只算1条命令）
  async saveFavoritesBatch(
    userName: string,
    favorites: Array<{ source: string; id: string; favorite: Favorite }>,
  ): Promise<void> {
    if (favorites.length === 0) return;

    // 检查 storage 是否支持批量操作
    if (typeof this.storage.setFavoritesBatch === 'function') {
      incrementDbQuery();
      const batchData: { [key: string]: Favorite } = {};
      for (const { source, id, favorite } of favorites) {
        const key = generateStorageKey(source, id);
        batchData[key] = favorite;
      }
      await this.storage.setFavoritesBatch(userName, batchData);
    } else {
      // 回退：逐条保存
      for (const { source, id, favorite } of favorites) {
        await this.saveFavorite(userName, source, id, favorite);
      }
    }
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string,
  ): Promise<boolean> {
    incrementDbQuery();
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  // ---------- 用户相关 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    incrementDbQuery();
    await this.storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    incrementDbQuery();
    return this.storage.verifyUser(userName, password);
  }

  // 检查用户是否已存在
  async checkUserExist(userName: string): Promise<boolean> {
    incrementDbQuery();
    return this.storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    incrementDbQuery();
    await this.storage.changePassword(userName, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    incrementDbQuery();
    await this.storage.deleteUser(userName);
  }

  // ---------- 用户相关（新版本 V2，支持 OIDC） ----------
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
    if (typeof (this.storage as any).createUserV2 === 'function') {
      await (this.storage as any).createUserV2(
        userName,
        password,
        role,
        tags,
        oidcSub,
        enabledApis,
        cardKey,
        inviter,
      );
    }
  }

  async verifyUserV2(userName: string, password: string): Promise<boolean> {
    incrementDbQuery();
    if (typeof (this.storage as any).verifyUserV2 === 'function') {
      return (this.storage as any).verifyUserV2(userName, password);
    }
    return false;
  }

  async checkUserExistV2(userName: string): Promise<boolean> {
    incrementDbQuery();
    if (typeof (this.storage as any).checkUserExistV2 === 'function') {
      return (this.storage as any).checkUserExistV2(userName);
    }
    return false;
  }

  async getUserByOidcSub(oidcSub: string): Promise<string | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getUserByOidcSub === 'function') {
      return (this.storage as any).getUserByOidcSub(oidcSub);
    }
    return null;
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
    if (typeof (this.storage as any).getUserInfoV2 === 'function') {
      return (this.storage as any).getUserInfoV2(userName);
    }
    return null;
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    incrementDbQuery();
    return this.storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    incrementDbQuery();
    await this.storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    incrementDbQuery();
    await this.storage.deleteSearchHistory(userName, keyword);
  }

  // 获取全部用户名
  async getAllUsers(): Promise<string[]> {
    incrementDbQuery();
    if (typeof (this.storage as any).getAllUsers === 'function') {
      return (this.storage as any).getAllUsers();
    }
    return [];
  }

  // ---------- 管理员配置 ----------
  async getAdminConfig(): Promise<AdminConfig | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getAdminConfig === 'function') {
      return (this.storage as any).getAdminConfig();
    }
    return null;
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).setAdminConfig === 'function') {
      await (this.storage as any).setAdminConfig(config);
    }
  }

  // ---------- 跳过片头片尾配置 ----------
  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<EpisodeSkipConfig | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getSkipConfig === 'function') {
      return (this.storage as any).getSkipConfig(userName, source, id);
    }
    return null;
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: EpisodeSkipConfig,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).setSkipConfig === 'function') {
      await (this.storage as any).setSkipConfig(userName, source, id, config);
    }
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).deleteSkipConfig === 'function') {
      await (this.storage as any).deleteSkipConfig(userName, source, id);
    }
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: EpisodeSkipConfig }> {
    incrementDbQuery();
    if (typeof (this.storage as any).getAllSkipConfigs === 'function') {
      return (this.storage as any).getAllSkipConfigs(userName);
    }
    return {};
  }

  // ---------- 剧集跳过配置（新版，多片段支持）----------
  async getEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<EpisodeSkipConfig | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getEpisodeSkipConfig === 'function') {
      return (this.storage as any).getEpisodeSkipConfig(userName, source, id);
    }
    return null;
  }

  async saveEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: EpisodeSkipConfig,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).saveEpisodeSkipConfig === 'function') {
      await (this.storage as any).saveEpisodeSkipConfig(
        userName,
        source,
        id,
        config,
      );
    }
  }

  async deleteEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).deleteEpisodeSkipConfig === 'function') {
      await (this.storage as any).deleteEpisodeSkipConfig(userName, source, id);
    }
  }

  async getAllEpisodeSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: EpisodeSkipConfig }> {
    incrementDbQuery();
    if (typeof (this.storage as any).getAllEpisodeSkipConfigs === 'function') {
      return (this.storage as any).getAllEpisodeSkipConfigs(userName);
    }
    return {};
  }

  // ---------- 数据清理 ----------
  async clearAllData(): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).clearAllData === 'function') {
      await (this.storage as any).clearAllData();
    } else {
      throw new Error('存储类型不支持清空数据操作');
    }
  }

  // ---------- 通用缓存方法 ----------
  async getCache(key: string): Promise<any | null> {
    incrementDbQuery();
    if (typeof this.storage.getCache === 'function') {
      return await this.storage.getCache(key);
    }
    return null;
  }

  async setCache(
    key: string,
    data: any,
    expireSeconds?: number,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof this.storage.setCache === 'function') {
      await this.storage.setCache(key, data, expireSeconds);
    }
  }

  async deleteCache(key: string): Promise<void> {
    incrementDbQuery();
    if (typeof this.storage.deleteCache === 'function') {
      await this.storage.deleteCache(key);
    }
  }

  async clearExpiredCache(prefix?: string): Promise<void> {
    incrementDbQuery();
    if (typeof this.storage.clearExpiredCache === 'function') {
      await this.storage.clearExpiredCache(prefix);
    }
  }

  // ---------- 播放统计相关 ----------
  async getPlayStats(): Promise<PlayStatsResult> {
    incrementDbQuery();
    if (typeof (this.storage as any).getPlayStats === 'function') {
      return (this.storage as any).getPlayStats();
    }

    // 如果存储不支持统计功能，返回默认值
    return {
      totalUsers: 0,
      totalWatchTime: 0,
      totalPlays: 0,
      avgWatchTimePerUser: 0,
      avgPlaysPerUser: 0,
      userStats: [],
      topSources: [],
      dailyStats: [],
      // 新增：用户注册统计
      registrationStats: {
        todayNewUsers: 0,
        totalRegisteredUsers: 0,
        registrationTrend: [],
      },
      // 新增：用户活跃度统计
      activeUsers: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
    };
  }

  async getUserPlayStat(userName: string): Promise<UserPlayStat> {
    incrementDbQuery();
    if (typeof (this.storage as any).getUserPlayStat === 'function') {
      return (this.storage as any).getUserPlayStat(userName);
    }

    // 如果存储不支持统计功能，返回默认值
    return {
      username: userName,
      totalWatchTime: 0,
      totalPlays: 0,
      lastPlayTime: 0,
      recentRecords: [],
      avgWatchTime: 0,
      mostWatchedSource: '',
    };
  }

  async getContentStats(limit = 10): Promise<ContentStat[]> {
    incrementDbQuery();
    if (typeof (this.storage as any).getContentStats === 'function') {
      return (this.storage as any).getContentStats(limit);
    }

    // 如果存储不支持统计功能，返回空数组
    return [];
  }

  async updatePlayStatistics(
    _userName: string,
    _source: string,
    _id: string,
    _watchTime: number,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).updatePlayStatistics === 'function') {
      await (this.storage as any).updatePlayStatistics(
        _userName,
        _source,
        _id,
        _watchTime,
      );
    }
  }

  async updateUserLoginStats(
    userName: string,
    loginTime: number,
    isFirstLogin?: boolean,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).updateUserLoginStats === 'function') {
      await (this.storage as any).updateUserLoginStats(
        userName,
        loginTime,
        isFirstLogin,
      );
    }
  }

  // 删除 V1 用户密码数据（用于 V1→V2 迁移）
  async deleteV1Password(userName: string): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).client !== 'undefined') {
      await (this.storage as any).client.del(`u:${userName}:pwd`);
    }
  }

  // 检查存储类型是否支持统计功能
  isStatsSupported(): boolean {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    return storageType !== 'localstorage';
  }

  // ============ 卡密系统相关方法 ============

  async createCardKey(cardKey: CardKey): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).createCardKey === 'function') {
      await (this.storage as any).createCardKey(cardKey);
    }
  }

  async getCardKey(keyHash: string): Promise<CardKey | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getCardKey === 'function') {
      return (this.storage as any).getCardKey(keyHash);
    }
    return null;
  }

  async getAllCardKeys(): Promise<CardKey[]> {
    incrementDbQuery();
    if (typeof (this.storage as any).getAllCardKeys === 'function') {
      return (this.storage as any).getAllCardKeys();
    }
    return [];
  }

  async updateCardKey(
    keyHash: string,
    updates: Partial<CardKey>,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).updateCardKey === 'function') {
      await (this.storage as any).updateCardKey(keyHash, updates);
    }
  }

  async deleteCardKey(keyHash: string): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).deleteCardKey === 'function') {
      await (this.storage as any).deleteCardKey(keyHash);
    }
  }

  async getUserCardKeyInfo(userName: string): Promise<UserCardKeyData | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getUserCardKeyInfo === 'function') {
      return (this.storage as any).getUserCardKeyInfo(userName);
    }
    return null;
  }

  async updateUserCardKeyInfo(
    userName: string,
    info: UserCardKeyData,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).updateUserCardKeyInfo === 'function') {
      await (this.storage as any).updateUserCardKeyInfo(userName, info);
    }
  }

  async getUserCardKey(userName: string): Promise<UserCardKeyInfo | null> {
    incrementDbQuery();
    console.log('db.getUserCardKey - userName:', userName);
    console.log(
      'db.getUserCardKey - has getFullUserCardKey:',
      typeof (this.storage as any).getFullUserCardKey === 'function',
    );

    if (typeof (this.storage as any).getFullUserCardKey === 'function') {
      const result = (this.storage as any).getFullUserCardKey(userName);
      console.log(
        'db.getUserCardKey - result from getFullUserCardKey:',
        result,
      );
      return result;
    }

    const cardKeyInfo = await this.getUserCardKeyInfo(userName);
    console.log(
      'db.getUserCardKey - cardKeyInfo from getUserCardKeyInfo:',
      cardKeyInfo,
    );

    if (!cardKeyInfo) {
      return null;
    }

    const now = Date.now();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil((cardKeyInfo.expiresAt - now) / msPerDay);

    const result = {
      boundKey: cardKeyInfo.boundKey,
      expiresAt: cardKeyInfo.expiresAt,
      boundAt: cardKeyInfo.boundAt,
      daysRemaining,
      isExpiring: daysRemaining <= 30,
      isExpired: daysRemaining <= 0,
    };
    console.log('db.getUserCardKey - fallback result:', result);

    return result;
  }

  async isUserCardKeyExpired(userName: string): Promise<boolean> {
    incrementDbQuery();
    const cardKeyInfo = await this.getUserCardKey(userName);
    return cardKeyInfo ? cardKeyInfo.isExpired : false;
  }

  // ========== 积分和邀请系统 ==========

  async getUserPoints(
    userName: string,
  ): Promise<import('./types').UserPoints | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getUserPoints === 'function') {
      return (this.storage as any).getUserPoints(userName);
    }
    return null;
  }

  async updateUserPoints(points: import('./types').UserPoints): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).updateUserPoints === 'function') {
      await (this.storage as any).updateUserPoints(points);
    }
  }

  async addPointsRecord(record: import('./types').PointsRecord): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).addPointsRecord === 'function') {
      await (this.storage as any).addPointsRecord(record);
    }
  }

  async getPointsHistory(
    userName: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<import('./types').PointsRecord[]> {
    incrementDbQuery();
    if (typeof (this.storage as any).getPointsHistory === 'function') {
      return (this.storage as any).getPointsHistory(userName, page, pageSize);
    }
    return [];
  }

  async getInvitationByInvitee(
    invitee: string,
  ): Promise<import('./types').Invitation | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getInvitationByInvitee === 'function') {
      return (this.storage as any).getInvitationByInvitee(invitee);
    }
    return null;
  }

  async getInvitationsByInviter(
    inviter: string,
  ): Promise<import('./types').Invitation[]> {
    incrementDbQuery();
    if (typeof (this.storage as any).getInvitationsByInviter === 'function') {
      return (this.storage as any).getInvitationsByInviter(inviter);
    }
    return [];
  }

  async createInvitation(
    invitation: import('./types').Invitation,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).createInvitation === 'function') {
      await (this.storage as any).createInvitation(invitation);
    }
  }

  async updateInvitation(
    id: string,
    updates: Partial<import('./types').Invitation>,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).updateInvitation === 'function') {
      await (this.storage as any).updateInvitation(id, updates);
    }
  }

  async getIPRewardRecord(
    ipAddress: string,
  ): Promise<import('./types').IPRewardRecord | null> {
    incrementDbQuery();
    if (typeof (this.storage as any).getIPRewardRecord === 'function') {
      return (this.storage as any).getIPRewardRecord(ipAddress);
    }
    return null;
  }

  async createIPRewardRecord(
    record: import('./types').IPRewardRecord,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).createIPRewardRecord === 'function') {
      await (this.storage as any).createIPRewardRecord(record);
    }
  }

  async getInvitationConfig(): Promise<
    import('./types').InvitationConfig | null
  > {
    incrementDbQuery();
    if (typeof (this.storage as any).getInvitationConfig === 'function') {
      const config = await (this.storage as any).getInvitationConfig();
      // 如果配置不存在，返回默认配置
      if (!config) {
        return {
          enabled: true,
          rewardPoints: 100,
          redeemThreshold: 500,
          cardKeyType: 'week',
          updatedAt: Date.now(),
        };
      }
      return config;
    }
    return null;
  }

  async setInvitationConfig(
    config: import('./types').InvitationConfig,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).setInvitationConfig === 'function') {
      await (this.storage as any).setInvitationConfig(config);
    }
  }

  async getUserCardKeys(
    userName: string,
  ): Promise<import('./types').UserCardKey[]> {
    incrementDbQuery();
    if (typeof (this.storage as any).getUserCardKeys === 'function') {
      return (this.storage as any).getUserCardKeys(userName);
    }
    return [];
  }

  async addUserCardKey(cardKey: import('./types').UserCardKey): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).addUserCardKey === 'function') {
      await (this.storage as any).addUserCardKey(cardKey);
    }
  }

  async updateUserCardKey(
    id: string,
    updates: Partial<import('./types').UserCardKey>,
  ): Promise<void> {
    incrementDbQuery();
    if (typeof (this.storage as any).updateUserCardKey === 'function') {
      await (this.storage as any).updateUserCardKey(id, updates);
    }
  }
}

// 导出默认实例
export const db = new DbManager();
