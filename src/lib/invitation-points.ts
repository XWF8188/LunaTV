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
  UserPointsInfo,
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
    console.log('=== InvitationService.validateInvitationCode 开始 ===');
    console.log('待验证的邀请码:', code);

    const allUsers = await db.getAllUsers();
    console.log('系统中所有用户数:', allUsers.length);

    for (const username of allUsers) {
      const userPoints = await db.getUserPoints(username);

      console.log(`检查用户 ${username}:`, {
        hasPoints: !!userPoints,
        hasInvitationCode: !!userPoints?.invitationCode,
        invitationCode: userPoints?.invitationCode || '无',
      });

      if (userPoints && userPoints.invitationCode === code) {
        console.log('✅ 找到匹配的邀请人:', username);
        console.log('=== InvitationService.validateInvitationCode 结束 ===');
        return {
          valid: true,
          inviter: username,
        };
      }
    }

    console.log('❌ 未找到匹配的邀请码');
    console.log('=== InvitationService.validateInvitationCode 结束 ===');
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
    let userPoints = await db.getUserPoints(username);

    // 如果用户没有积分记录，自动创建并生成邀请码
    if (!userPoints) {
      const code = generateInvitationCode();
      userPoints = {
        username,
        invitationCode: code,
        balance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        updatedAt: Date.now(),
      };
      await db.updateUserPoints(userPoints);
    } else if (!userPoints.invitationCode) {
      // 如果有积分记录但没有邀请码，生成一个
      userPoints.invitationCode = generateInvitationCode();
      userPoints.updatedAt = Date.now();
      await db.updateUserPoints(userPoints);
    }

    const invitations = await db.getInvitationsByInviter(username);

    return {
      code: userPoints.invitationCode,
      totalInvites: invitations.length,
      totalRewards: userPoints.totalEarned || 0,
      balance: userPoints.balance || 0,
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
    let userPoints = await db.getUserPoints(username);

    // 如果用户没有积分记录，创建一个
    if (!userPoints) {
      userPoints = {
        username,
        invitationCode: '',
        balance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        updatedAt: Date.now(),
      };
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

  // 使用积分兑换卡密
  static async redeemForCardKey(
    username: string,
  ): Promise<{ success: boolean; cardKey?: string; error?: string }> {
    try {
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

      const cardKeyTypeLabels: Record<string, string> = {
        year: '年卡',
        quarter: '季卡',
        month: '月卡',
        week: '周卡',
      };
      const cardKeyTypeName = cardKeyTypeLabels[config.cardKeyType] || '卡密';

      const { CardKeyService } = await import('./cardkey');
      const cardKeyService = new CardKeyService();
      const result = await cardKeyService.createCardKey(config.cardKeyType);
      const cardKey = result.keys[0];

      const allCardKeys = await db.getAllCardKeys();
      const fullCardKey = allCardKeys.find((ck) => ck.key === cardKey);

      if (!fullCardKey) {
        throw new Error('卡密生成失败');
      }

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

      await this.deductPointsWithCardKey(
        username,
        requiredPoints,
        `兑换${cardKeyTypeName}`,
        userCardKey.id,
      );

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

  // 扣除积分并关联卡密（用于兑换，避免重复记录）
  static async deductPointsWithCardKey(
    username: string,
    amount: number,
    reason: string,
    cardKeyId: string,
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

    const record: PointsRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      type: 'redeem',
      amount: -amount,
      reason,
      cardKeyId,
      createdAt: Date.now(),
    };

    await db.addPointsRecord(record);
  }

  // 管理员调整积分
  static async adjustPoints(
    username: string,
    type: 'add' | 'deduct',
    amount: number,
    reason: string,
    adminUsername: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (amount <= 0 || !Number.isInteger(amount)) {
        return { success: false, error: '积分数量必须为正整数' };
      }

      if (!reason || reason.trim().length === 0) {
        return { success: false, error: '请输入调整原因' };
      }

      if (reason.length > 200) {
        return { success: false, error: '调整原因不能超过200字符' };
      }

      let userPoints = await db.getUserPoints(username);

      if (!userPoints) {
        userPoints = {
          username,
          invitationCode: '',
          balance: 0,
          totalEarned: 0,
          totalRedeemed: 0,
          updatedAt: Date.now(),
        };
      }

      if (type === 'add') {
        userPoints.balance += amount;
        userPoints.totalEarned += amount;
      } else {
        if (userPoints.balance < amount) {
          return { success: false, error: '扣除积分不能超过用户当前余额' };
        }
        userPoints.balance -= amount;
        userPoints.totalRedeemed += amount;
      }

      userPoints.updatedAt = Date.now();
      await db.updateUserPoints(userPoints);

      const record: PointsRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username,
        type: 'admin_adjust',
        amount: type === 'add' ? amount : -amount,
        reason: reason.trim(),
        adminUsername,
        createdAt: Date.now(),
      };

      await db.addPointsRecord(record);

      return { success: true };
    } catch (error) {
      console.error('调整积分失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '操作失败，请稍后重试',
      };
    }
  }

  // 获取所有用户的积分信息
  static async getAllUsersPoints(): Promise<UserPointsInfo[]> {
    const allUsers = await db.getAllUsers();
    const usersPoints: UserPointsInfo[] = [];

    for (const username of allUsers) {
      const points = await db.getUserPoints(username);
      usersPoints.push({
        username,
        balance: points?.balance || 0,
        totalEarned: points?.totalEarned || 0,
        totalRedeemed: points?.totalRedeemed || 0,
      });
    }

    return usersPoints;
  }

  // 获取用户积分详情
  static async getUserPointsInfo(username: string): Promise<UserPointsInfo> {
    const points = await db.getUserPoints(username);
    return {
      username,
      balance: points?.balance || 0,
      totalEarned: points?.totalEarned || 0,
      totalRedeemed: points?.totalRedeemed || 0,
    };
  }
}
