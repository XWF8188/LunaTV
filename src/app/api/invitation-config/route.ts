/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 },
      );
    }

    const config = await db.getInvitationConfig();

    if (!config) {
      return NextResponse.json({
        enabled: true,
        rewardPoints: 100,
        redeemThreshold: 300,
        cardKeyType: 'week',
      });
    }

    return NextResponse.json({
      enabled: config.enabled,
      rewardPoints: config.rewardPoints,
      redeemThreshold: config.redeemThreshold,
      cardKeyType: config.cardKeyType,
    });
  } catch (error) {
    console.error('获取邀请配置失败:', error);
    return NextResponse.json({ error: '获取邀请配置失败' }, { status: 500 });
  }
}
