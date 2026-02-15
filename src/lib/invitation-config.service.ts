/* eslint-disable no-console */

import { db } from './db';
import { InvitationConfig } from './types';

export class InvitationConfigService {
  private static readonly DEFAULT_CONFIG: InvitationConfig = {
    rewardPoints: 100,
    redeemThreshold: 500,
    cardKeyType: 'week',
    updatedAt: Date.now(),
  };

  async getConfig(): Promise<InvitationConfig> {
    const config = await db.getInvitationConfig();
    if (!config) {
      await this.initializeConfig();
      return InvitationConfigService.DEFAULT_CONFIG;
    }
    return config;
  }

  async updateConfig(updates: Partial<InvitationConfig>): Promise<void> {
    const currentConfig = await this.getConfig();

    const validatedConfig = this.validateConfig(updates);
    const newConfig: InvitationConfig = {
      ...currentConfig,
      ...validatedConfig,
      updatedAt: Date.now(),
    };

    await db.setInvitationConfig(newConfig);
    console.log('邀请配置已更新:', newConfig);
  }

  private async initializeConfig(): Promise<void> {
    await db.setInvitationConfig(InvitationConfigService.DEFAULT_CONFIG);
    console.log('邀请配置已初始化为默认值');
  }

  private validateConfig(
    updates: Partial<InvitationConfig>,
  ): Partial<InvitationConfig> {
    const errors: string[] = [];
    const validated: Partial<InvitationConfig> = {};

    if (updates.rewardPoints !== undefined) {
      if (
        typeof updates.rewardPoints !== 'number' ||
        updates.rewardPoints <= 0 ||
        !Number.isInteger(updates.rewardPoints)
      ) {
        errors.push('邀请奖励积分必须是正整数');
      } else {
        validated.rewardPoints = updates.rewardPoints;
      }
    }

    if (updates.redeemThreshold !== undefined) {
      if (
        typeof updates.redeemThreshold !== 'number' ||
        updates.redeemThreshold <= 0 ||
        !Number.isInteger(updates.redeemThreshold)
      ) {
        errors.push('兑换所需积分必须是正整数');
      } else {
        validated.redeemThreshold = updates.redeemThreshold;
      }
    }

    if (updates.cardKeyType !== undefined) {
      const validTypes: Array<'year' | 'quarter' | 'month' | 'week'> = [
        'year',
        'quarter',
        'month',
        'week',
      ];
      if (!validTypes.includes(updates.cardKeyType)) {
        errors.push('卡密类型无效');
      } else {
        validated.cardKeyType = updates.cardKeyType;
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    return validated;
  }
}

// 导出默认实例
export const invitationConfigService = new InvitationConfigService();
