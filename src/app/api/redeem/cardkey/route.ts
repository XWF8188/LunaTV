/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { PointsService } from '@/lib/invitation-points';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 },
      );
    }

    const result = await PointsService.redeemForCardKey(authInfo.username);

    return NextResponse.json(result);
  } catch (error) {
    console.error('兑换卡密失败:', error);
    return NextResponse.json({ error: '兑换卡密失败' }, { status: 500 });
  }
}
