/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfo } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfo(request);
    if (!authInfo?.username) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 },
      );
    }

    // 只有管理员可以访问
    if (authInfo.role !== 'owner' && authInfo.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const config = await db.storage.getInvitationConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('获取邀请配置失败:', error);
    return NextResponse.json({ error: '获取邀请配置失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authInfo = await getAuthInfo(request);
    if (!authInfo?.username) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 },
      );
    }

    // 只有管理员可以访问
    if (authInfo.role !== 'owner' && authInfo.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { rewardPoints, redeemThreshold, cardKeyType } = body;

    // 验证参数
    if (
      typeof rewardPoints !== 'number' ||
      rewardPoints <= 0 ||
      !Number.isInteger(rewardPoints)
    ) {
      return NextResponse.json(
        { error: '奖励积分必须是正整数' },
        { status: 400 },
      );
    }

    if (
      typeof redeemThreshold !== 'number' ||
      redeemThreshold <= 0 ||
      !Number.isInteger(redeemThreshold)
    ) {
      return NextResponse.json(
        { error: '兑换门槛必须是正整数' },
        { status: 400 },
      );
    }

    if (!['year', 'quarter', 'month', 'week'].includes(cardKeyType)) {
      return NextResponse.json({ error: '无效的卡密类型' }, { status: 400 });
    }

    const config = {
      rewardPoints,
      redeemThreshold,
      cardKeyType,
      updatedAt: Date.now(),
    };

    await db.storage.setInvitationConfig(config);

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error('更新邀请配置失败:', error);
    return NextResponse.json({ error: '更新邀请配置失败' }, { status: 500 });
  }
}
