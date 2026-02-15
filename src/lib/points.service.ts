/* eslint-disable no-console */

import { db } from './db';
import { InvitationConfig, PointsRecord, PointsHistoryResponse } from './types';
import { invitationService } from './invitation.service';
import { cardKeyService } from './cardkey';

export class PointsService {
  // 获取用户积分余额
  async getUserBalance(username: string): Promise<number> {
    const userPoints = await db.getUserPoints(username);
    return userPoints?.balance || 0;
  }

  // 增加用户积分
  async addPoints(
    username: string,
    amount: number,
    reason: string,
    relatedUser?: string,
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error('积分数量必须大于0');
    }

    const userPoints = await db.getUserPoints(username);
    const newBalance = (userPoints?.balance || 0) + amount;

    await db.createOrUpdateUserPoints(username, {
      balance: newBalance,
      totalEarned: (userPoints?.totalEarned || 0) + amount,
      updatedAt: Date.now(),
    });

    const record: PointsRecord = {
      id: this.generateId(),
      username,
      type: 'earn',
      amount,
      reason,
      relatedUser,
      createdAt: Date.now(),
    };
    await db.createPointsRecord(record);

    console.log(
      `用户 ${username} 积分增加 +${amount}, 原因: ${reason}, 新余额: ${newBalance}`,
    );
  }

  // 扣除用户积分
  async deductPoints(
    username: string,
    amount: number,
    reason: string,
    cardKeyId?: string,
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error('积分数量必须大于0');
    }

    const userPoints = await db.getUserPoints(username);
    const currentBalance = userPoints?.balance || 0;

    if (currentBalance < amount) {
      throw new Error(`积分不足，当前余额: ${currentBalance}，需要: ${amount}`);
    }

    const newBalance = currentBalance - amount;

    await db.createOrUpdateUserPoints(username, {
      balance: newBalance,
      totalRedeemed: (userPoints?.totalRedeemed || 0) + amount,
      updatedAt: Date.now(),
    });

    const record: PointsRecord = {
      id: this.generateId(),
      username,
      type: 'redeem',
      amount: -amount,
      reason,
      cardKeyId,
      createdAt: Date.now(),
    };
    await db.createPointsRecord(record);

    console.log(
      `用户 ${username} 积分扣除 -${amount}, 原因: ${reason}, 新余额: ${newBalance}`,
    );
  }

  // 获取积分历史记录
  async getPointsHistory(
    username: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PointsHistoryResponse> {
    return await db.getPointsHistory(username, page, pageSize);
  }

  // 使用积分兑换一周卡密
  async redeemForCardKey(
    username: string,
  ): Promise<{ success: boolean; cardKey?: string; error?: string }> {
    try {
      const config = await this.getConfig();
      if (!config) {
        throw new Error('系统配置未初始化');
      }

      const currentBalance = await this.getUserBalance(username);
      if (currentBalance < config.redeemThreshold) {
        return {
          success: false,
          error: `积分不足，当前余额: ${currentBalance}，需要: ${config.redeemThreshold}`,
        };
      }

      // 使用事务确保原子性
      const plainKey = await cardKeyService.createCardKeyForUser(
        username,
        config.cardKeyType,
      );

      await this.deductPoints(
        username,
        config.redeemThreshold,
        '兑换一周卡密',
        plainKey,
      );

      console.log(`用户 ${username} 成功兑换一周卡密: ${plainKey}`);
      return {
        success: true,
        cardKey: plainKey,
      };
    } catch (error: any) {
      console.error(`用户 ${username} 兑换卡密失败:`, error);
      return {
        success: false,
        error: error.message || '兑换失败',
      };
    }
  }

  // 邀请好友注册奖励
  async rewardForInvitation(
    inviter: string,
    invitee: string,
    ipAddress: string,
  ): Promise<{ rewarded: boolean; error?: string }> {
    try {
      const config = await this.getConfig();
      if (!config) {
        throw new Error('系统配置未初始化');
      }

      const ipRewarded = await invitationService.checkIPRewarded(ipAddress);
      if (ipRewarded) {
        return {
          rewarded: false,
          error: '该IP地址已领取过邀请奖励',
        };
      }

      await this.addPoints(
        inviter,
        config.rewardPoints,
        `邀请好友 ${invitee} 注册`,
        invitee,
      );

      await invitationService.markInvitationRewarded(invitee, ipAddress);

      return {
        rewarded: true,
      };
    } catch (error: any) {
      console.error(`邀请奖励发放失败:`, error);
      return {
        rewarded: false,
        error: error.message || '奖励发放失败',
      };
    }
  }

  // 获取邀请配置
  private async getConfig(): Promise<InvitationConfig | null> {
    return await db.getInvitationConfig();
  }

  // 生成唯一ID
  private generateId(): string {
    return `points_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出默认实例
export const pointsService = new PointsService();
