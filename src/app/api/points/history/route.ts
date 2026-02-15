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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const history = await PointsService.getPointsHistory(
      authInfo.username,
      page,
      pageSize,
    );

    return NextResponse.json({ history, page, pageSize });
  } catch (error) {
    console.error('获取积分历史失败:', error);
    return NextResponse.json({ error: '获取积分历史失败' }, { status: 500 });
  }
}
