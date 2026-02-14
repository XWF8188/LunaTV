/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { db } from './db';
import {
  BindCardKeyRequest,
  BindCardKeyResponse,
  CardKey,
  CardKeyType,
  CardKeyValidationResult,
  CreateCardKeyRequest,
  CreateCardKeyResponse,
  UserCardKeyInfo,
} from './types';

// 卡密有效期配置（天数）
const CARD_KEY_DURATION = {
  year: 365,
  quarter: 90,
  month: 30,
  week: 7,
};

export class CardKeyService {
  // 创建卡密
  async createCardKey(
    type: CardKeyType,
    count: number = 1,
  ): Promise<CreateCardKeyResponse> {
    const keys: string[] = [];

    for (let i = 0; i < count; i++) {
      const plainKey = this.generateRandomCardKey();
      const hashedKey = await this.hashCardKey(plainKey);

      const cardKey: CardKey = {
        key: plainKey, // 保存明文卡密
        keyHash: hashedKey, // 保存哈希用于验证
        keyType: type,
        status: 'unused',
        createdAt: Date.now(),
        expiresAt: this.calculateExpiryDate(type),
      };

      await db.createCardKey(cardKey);
      keys.push(plainKey);
    }

    return {
      keys,
      totalCount: keys.length,
      type,
    };
  }

  // 验证卡密有效性
  async validateCardKey(cardKey: string): Promise<CardKeyValidationResult> {
    const hashedKey = await this.hashCardKey(cardKey);

    // 由于我们现在使用 keyHash 作为查找键，需要查找所有卡密
    // 先获取所有卡密，然后匹配 keyHash
    const allCardKeys = await db.getAllCardKeys();
    const storedCardKey = allCardKeys.find((ck) => ck.keyHash === hashedKey);

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
      // 自动标记为已过期
      await db.updateCardKey(storedCardKey.keyHash, { status: 'expired' });
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

  // 绑定卡密到用户
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

    const hashedKey = validation.cardKey.keyHash;

    // 获取用户当前卡密信息
    const currentCardKeyInfo = await db.getUserCardKeyInfo(username);

    // 计算新的过期时间
    let newExpiresAt = validation.cardKey.expiresAt;
    let isNewCardKey = !currentCardKeyInfo;

    if (currentCardKeyInfo) {
      // 用户已有卡密，计算新卡密的额外天数
      const currentExpiryDate = currentCardKeyInfo.expiresAt;
      const newCardKeyExpiryDate = validation.cardKey.expiresAt;
      const newCardKeyCreatedAt = validation.cardKey.createdAt;

      // 计算新卡密的有效期（天数）
      const newCardKeyDuration = Math.round((newCardKeyExpiryDate - newCardKeyCreatedAt) / (1000 * 60 * 60 * 24));

      // 如果当前卡密已过期，从现在开始累加；否则从当前过期时间开始累加
      const baseTime = currentExpiryDate < Date.now() ? Date.now() : currentExpiryDate;
      newExpiresAt = baseTime + newCardKeyDuration * 24 * 60 * 60 * 1000;

      console.log(`绑定卡密 - 用户已有卡密，累加时间: ${newCardKeyDuration}天，新过期时间: ${new Date(newExpiresAt).toLocaleString('zh-CN')}`);
    } else {
      console.log(`绑定卡密 - 用户新绑定，过期时间: ${new Date(newExpiresAt).toLocaleString('zh-CN')}`);
    }

    // 更新卡密状态为已使用
    await db.updateCardKey(hashedKey, {
      status: 'used',
      boundTo: username,
      boundAt: Date.now(),
    });

    // 更新用户卡密信息
    const userCardKeyInfo: import('./admin.types').UserCardKeyData = {
      boundKey: hashedKey,
      expiresAt: newExpiresAt,
      boundAt: Date.now(),
    };
    await db.updateUserCardKeyInfo(username, userCardKeyInfo);

    return { success: true };
  }

    const hashedKey = validation.cardKey.keyHash;
    console.log('绑定卡密 - keyHash:', hashedKey, 'username:', username);

    // 获取用户当前卡密信息
    const currentCardKeyInfo = await db.getUserCardKeyInfo(username);

    // 检查新卡密的过期时间是否晚于当前卡密
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
    console.log('更新卡密状态为已使用，keyHash:', hashedKey);
    await db.updateCardKey(hashedKey, {
      status: 'used',
      boundTo: username,
      boundAt: Date.now(),
    });

    // 更新用户卡密信息
    const userCardKeyInfo: import('./admin.types').UserCardKeyData = {
      boundKey: hashedKey,
      expiresAt: validation.cardKey.expiresAt,
      boundAt: Date.now(),
    };
    console.log('更新用户卡密信息，username:', username);
    await db.updateUserCardKeyInfo(username, userCardKeyInfo);

    return { success: true };
  }

  // 获取用户卡密信息
  async getUserCardKey(username: string): Promise<UserCardKeyInfo | null> {
    return await db.getUserCardKey(username);
  }

  // 检查用户卡密是否过期
  async isUserCardKeyExpired(username: string): Promise<boolean> {
    return await db.isUserCardKeyExpired(username);
  }

  // 获取所有卡密列表（管理员）
  async getAllCardKeys(): Promise<CardKey[]> {
    return await db.getAllCardKeys();
  }

  // 删除未使用的卡密
  async deleteUnusedCardKey(cardKeyHash: string): Promise<boolean> {
    try {
      await db.deleteCardKey(cardKeyHash);
      return true;
    } catch (error) {
      console.error('删除卡密失败:', error);
      return false;
    }
  }

  // 清理过期的未使用卡密
  async cleanupExpiredCardKeys(): Promise<number> {
    try {
      const allCardKeys = await db.getAllCardKeys();
      const now = Date.now();
      let cleanedCount = 0;

      for (const cardKey of allCardKeys) {
        if (cardKey.status === 'unused' && cardKey.expiresAt < now) {
          // 标记为已过期
          await db.updateCardKey(cardKey.key, { status: 'expired' });
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('清理过期卡密失败:', error);
      return 0;
    }
  }

  // 导出卡密列表
  async exportCardKeys(): Promise<string> {
    const cardKeys = await db.getAllCardKeys();

    // CSV 格式
    const headers = [
      '密钥哈希',
      '类型',
      '状态',
      '创建时间',
      '过期时间',
      '绑定用户',
      '绑定时间',
    ];
    const rows = cardKeys.map((ck) => [
      ck.key,
      ck.keyType,
      ck.status,
      new Date(ck.createdAt).toISOString(),
      new Date(ck.expiresAt).toISOString(),
      ck.boundTo || '',
      ck.boundAt ? new Date(ck.boundAt).toISOString() : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');
    return csvContent;
  }

  // 计算卡密过期时间
  calculateExpiryDate(type: CardKeyType): number {
    const days = CARD_KEY_DURATION[type];
    const msPerDay = 1000 * 60 * 60 * 24;
    return Date.now() + days * msPerDay;
  }

  // 生成随机卡密（明文）
  generateRandomCardKey(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 16;
    let result = '';

    // 使用 crypto.getRandomValues 生成安全的随机数
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }

    return result;
  }

  // 哈希卡密
  async hashCardKey(cardKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(cardKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 验证卡密哈希
  async verifyCardKeyHash(cardKey: string, hash: string): Promise<boolean> {
    const computedHash = await this.hashCardKey(cardKey);
    return computedHash === hash;
  }
}

// 导出默认实例
export const cardKeyService = new CardKeyService();
