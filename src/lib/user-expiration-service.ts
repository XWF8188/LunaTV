import { db } from '@/lib/db';
import { getConfig } from '@/lib/config';
import { RenewalHistory } from '@/lib/types';

export interface UserExpirationInfo {
  expirationDate?: string;
  daysRemaining?: number;
  needReminder: boolean;
  status: 'active' | 'expiring' | 'expired';
}

export class UserExpirationService {
  static async setExpirationDate(
    username: string,
    validityDays: number = 365,
  ): Promise<Date> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + validityDays);
    await db.setUserExpirationDate(username, expirationDate);
    return expirationDate;
  }

  static async getExpirationDate(username: string): Promise<Date | null> {
    return await db.getUserExpirationDate(username);
  }

  static async checkExpiration(username: string): Promise<UserExpirationInfo> {
    const expirationDate = await this.getExpirationDate(username);
    const now = new Date();

    if (!expirationDate) {
      return {
        needReminder: false,
        status: 'active',
      };
    }

    const daysRemaining = Math.floor(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let status: 'active' | 'expiring' | 'expired';
    if (daysRemaining <= 0) {
      status = 'expired';
    } else if (daysRemaining <= 30) {
      status = 'expiring';
    } else {
      status = 'active';
    }

    return {
      expirationDate: expirationDate.toISOString(),
      daysRemaining,
      needReminder: daysRemaining <= 30 && daysRemaining > 0,
      status,
    };
  }

  static async isAccountExpired(username: string): Promise<boolean> {
    const expirationInfo = await this.checkExpiration(username);
    return expirationInfo.status === 'expired';
  }

  static async renewAccount(
    username: string,
    code: string,
    renewedBy: string,
    validityDays: number = 365,
  ): Promise<Date> {
    const currentExpirationDate = await this.getExpirationDate(username);
    const newExpirationDate = new Date();

    if (currentExpirationDate) {
      newExpirationDate.setTime(currentExpirationDate.getTime());
    }

    newExpirationDate.setDate(newExpirationDate.getDate() + validityDays);

    const config = await getConfig();
    const defaultValidityDays =
      config.ActivationCodeConfig?.defaultValidityDays || 365;
    const actualValidityDays = validityDays || defaultValidityDays;

    await db.setUserExpirationDate(username, newExpirationDate);

    const renewalHistory: RenewalHistory = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      renewedAt: new Date(),
      previousExpiration: currentExpirationDate || new Date(),
      newExpiration: newExpirationDate,
      codeUsed: code,
      renewedBy,
    };

    await db.addRenewalHistory(renewalHistory);

    return newExpirationDate;
  }

  static async getRenewalHistory(username: string): Promise<RenewalHistory[]> {
    return await db.getRenewalHistory(username);
  }

  static async canBypassExpirationCheck(username: string): Promise<boolean> {
    try {
      const config = await getConfig();
      const userConfig = config.UserConfig.Users.find(
        (u) => u.username === username,
      );

      if (!userConfig) {
        return false;
      }

      return userConfig.role === 'owner' || userConfig.role === 'admin';
    } catch (error) {
      console.error('检查用户权限失败:', error);
      return false;
    }
  }
}
