/* eslint-disable no-console */

import { db } from './db';
import { Invitation, IPRewardRecord, UserInvitationInfo } from './types';

export class InvitationService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  }

  // 生成邀请码
  generateInvitationCode(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 16;
    let result = '';

    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }

    return result;
  }

  // 为用户创建邀请码
  async createInvitationForUser(username: string): Promise<string> {
    const code = this.generateInvitationCode();
    const invitation: Invitation = {
      id: this.generateId(),
      inviter: username,
      invitee: '',
      invitationCode: code,
      ipAddress: '',
      rewarded: false,
      createdAt: Date.now(),
    };

    await db.createInvitation(invitation);
    console.log(`为用户 ${username} 创建邀请码: ${code}`);
    return code;
  }

  // 获取用户邀请码
  async getUserInvitationCode(username: string): Promise<string | null> {
    const invitations = await db.getInvitationsByInviter(username);
    if (invitations.length > 0) {
      return invitations[0].invitationCode;
    }
    return null;
  }

  // 确保用户有邀请码，如果没有则创建
  async ensureUserHasInvitationCode(username: string): Promise<string> {
    let code = await this.getUserInvitationCode(username);
    if (!code) {
      code = await this.createInvitationForUser(username);
    }
    return code;
  }

  // 验证邀请码
  async validateInvitationCode(
    code: string,
  ): Promise<{ valid: boolean; inviter?: string; error?: string }> {
    const invitation = await db.getInvitationByCode(code);

    if (!invitation) {
      return {
        valid: false,
        error: '邀请码无效或不存在',
      };
    }

    if (invitation.invitee && invitation.invitee !== '') {
      return {
        valid: false,
        error: '该邀请码已被使用',
      };
    }

    return {
      valid: true,
      inviter: invitation.inviter,
    };
  }

  // 创建推荐关系
  async createReferral(
    inviter: string,
    invitee: string,
    code: string,
    ipAddress: string,
  ): Promise<void> {
    const invitation = await db.getInvitationByCode(code);
    if (!invitation) {
      throw new Error('邀请码不存在');
    }

    await db.updateInvitation(invitation.id, {
      invitee,
      ipAddress,
    });

    console.log(
      `创建推荐关系: ${inviter} -> ${invitee}, IP: ${ipAddress}, 邀请码: ${code}`,
    );
  }

  // 获取用户邀请信息
  async getUserInvitationInfo(username: string): Promise<UserInvitationInfo> {
    const code = await this.ensureUserHasInvitationCode(username);
    const inviteLink = `${this.baseUrl}/register?invite=${code}`;

    const invitations = await db.getInvitationsByInviter(username);
    const rewardedInvitations = invitations.filter((inv) => inv.rewarded);

    const totalInvites = invitations.filter(
      (inv) => inv.invitee && inv.invitee !== '',
    ).length;
    const totalRewards = rewardedInvitations.length;

    return {
      code,
      inviteLink,
      totalInvites,
      totalRewards,
    };
  }

  // 检查IP是否已奖励过
  async checkIPRewarded(ipAddress: string): Promise<boolean> {
    const record = await db.getIPRewardRecord(ipAddress);
    return !!record;
  }

  // 标记邀请已奖励
  async markInvitationRewarded(
    invitee: string,
    ipAddress: string,
  ): Promise<void> {
    const invitation = await db.getInvitationByInvitee(invitee);
    if (!invitation) {
      throw new Error('邀请关系不存在');
    }

    await db.updateInvitation(invitation.id, {
      rewarded: true,
      rewardTime: Date.now(),
    });

    const ipRecord: IPRewardRecord = {
      id: this.generateId(),
      ipAddress,
      inviter: invitation.inviter,
      invitee,
      rewardTime: Date.now(),
    };
    await db.createIPRewardRecord(ipRecord);

    console.log(`标记邀请已奖励: ${invitation.inviter} <- ${invitee}`);
  }

  // 生成唯一ID
  private generateId(): string {
    return `invitation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出默认实例
export const invitationService = new InvitationService();
