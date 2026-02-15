/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfo } from '@/lib/auth';
import { PointsService } from '@/lib/invitation-points';

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

    const balance = await PointsService.getUserBalance(authInfo.username);

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('获取积分余额失败:', error);
    return NextResponse.json({ error: '获取积分余额失败' }, { status: 500 });
  }
}
