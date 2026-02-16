/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { db } from './db';
import type {
  Invitation,
  InvitationConfig,
  IPRewardRecord,
  PointsRecord,
  UserCardKey,
  UserPoints,
  UserInvitationInfo,
} from './types';

// 生成16位随机邀请码
export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 邀请服务
export class InvitationService {
  // 为用户生成邀请码
  static async generateInvitationCode(username: string): Promise<string> {
    const code = generateInvitationCode();

    // 检查用户是否已有积分记录
    const existingPoints = await db.getUserPoints(username);
    if (existingPoints) {
      existingPoints.invitationCode = code;
      existingPoints.updatedAt = Date.now();
      await db.updateUserPoints(existingPoints);
      return code;
    }

    // 如果用户没有积分记录，创建一个
    const userPoints: UserPoints = {
      username,
      invitationCode: code,
      balance: 0,
      totalEarned: 0,
      totalRedeemed: 0,
      updatedAt: Date.now(),
    };
    await db.updateUserPoints(userPoints);

    return code;
  }

  // 验证邀请码
  static async validateInvitationCode(
    code: string,
  ): Promise<{ valid: boolean; inviter?: string }> {
    const allUsers = await db.getAllUsers();

    for (const username of allUsers) {
      const userPoints = await db.getUserPoints(username);
      if (userPoints && userPoints.invitationCode === code) {
        return {
          valid: true,
          inviter: username,
        };
      }
    }

    return {
      valid: false,
    };
  }

  // 创建推荐关系
  static async createReferral(
    inviter: string,
    invitee: string,
    code: string,
    ip: string,
  ): Promise<void> {
    const invitation: Invitation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      inviter,
      invitee,
      invitationCode: code,
      ipAddress: ip,
      rewarded: false,
      createdAt: Date.now(),
    };

    await db.createInvitation(invitation);
  }

  // 获取用户邀请信息
  static async getUserInvitationInfo(
    username: string,
  ): Promise<UserInvitationInfo> {
    const userPoints = await db.getUserPoints(username);
    const invitations = await db.getInvitationsByInviter(username);

    return {
      code: userPoints?.invitationCode || '',
      totalInvites: invitations.length,
      totalRewards: userPoints?.totalEarned || 0,
      balance: userPoints?.balance || 0,
    };
  }

  // 检查IP是否已奖励过
  static async checkIPRewarded(ip: string): Promise<boolean> {
    const record = await db.getIPRewardRecord(ip);
    return !!record;
  }
}

// 积分服务
export class PointsService {
  // 获取用户积分余额
  static async getUserBalance(username: string): Promise<number> {
    const userPoints = await db.getUserPoints(username);
    return userPoints?.balance || 0;
  }

  // 增加用户积分
  static async addPoints(
    username: string,
    amount: number,
    reason: string,
    relatedUser?: string,
  ): Promise<void> {
    const userPoints = await db.getUserPoints(username);
    if (!userPoints) {
      throw new Error(`用户 ${username} 不存在`);
    }

    userPoints.balance += amount;
    userPoints.totalEarned += amount;
    userPoints.updatedAt = Date.now();

    await db.updateUserPoints(userPoints);

    // 记录积分历史
    const record: PointsRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      type: 'earn',
      amount,
      reason,
      relatedUser,
      createdAt: Date.now(),
    };

    await db.addPointsRecord(record);
  }

  // 扣除用户积分
  static async deductPoints(
    username: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    const userPoints = await db.getUserPoints(username);
    if (!userPoints) {
      throw new Error(`用户 ${username} 不存在`);
    }

    if (userPoints.balance < amount) {
      throw new Error('积分不足');
    }

    userPoints.balance -= amount;
    userPoints.totalRedeemed += amount;
    userPoints.updatedAt = Date.now();

    await db.updateUserPoints(userPoints);

    // 记录积分历史
    const record: PointsRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      type: 'redeem',
      amount: -amount,
      reason,
      createdAt: Date.now(),
    };

    await db.addPointsRecord(record);
  }

  // 获取积分历史记录
  static async getPointsHistory(
    username: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PointsRecord[]> {
    return await db.getPointsHistory(username, page, pageSize);
  }

  // 使用积分兑换一周卡密
  static async redeemForCardKey(
    username: string,
  ): Promise<{ success: boolean; cardKey?: string; error?: string }> {
    try {
      // 获取邀请配置
      const config = await db.getInvitationConfig();
      if (!config) {
        return { success: false, error: '邀请配置未设置' };
      }

      const requiredPoints = config.redeemThreshold;
      const balance = await this.getUserBalance(username);

      if (balance < requiredPoints) {
        return {
          success: false,
          error: `积分不足，需要 ${requiredPoints} 积分，当前 ${balance} 积分`,
        };
      }

      // 扣除积分
      await this.deductPoints(username, requiredPoints, '兑换一周卡密');

      // 生成卡密
      const { CardKeyService } = await import('./cardkey');
      const cardKeyService = new CardKeyService();
      const result = await cardKeyService.createCardKey(config.cardKeyType);
      const cardKey = result.keys[0];

      // 获取完整的卡密信息
      const allCardKeys = await db.getAllCardKeys();
      const fullCardKey = allCardKeys.find((ck) => ck.key === cardKey);

      if (!fullCardKey) {
        throw new Error('卡密生成失败');
      }

      // 创建用户卡密记录
      const userCardKey: UserCardKey = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        keyHash: fullCardKey.keyHash,
        username,
        type: config.cardKeyType,
        status: 'unused',
        source: 'redeem',
        createdAt: Date.now(),
        expiresAt: fullCardKey.expiresAt,
      };

      await db.addUserCardKey(userCardKey);

      // 更新积分记录，关联卡密
      const history = await this.getPointsHistory(username, 1, 1);
      if (history.length > 0) {
        history[0].cardKeyId = userCardKey.id;
        await db.addPointsRecord(history[0]);
      }

      return {
        success: true,
        cardKey: fullCardKey.key,
      };
    } catch (error) {
      console.error('兑换卡密失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '兑换失败，请稍后重试',
      };
    }
  }
}
