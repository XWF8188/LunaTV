/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { PointsService } from '@/lib/invitation-points';

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

    if (authInfo.role !== 'owner' && authInfo.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    if (!username) {
      return NextResponse.json({ error: '请提供用户名' }, { status: 400 });
    }

    const history = await PointsService.getPointsHistory(
      username,
      page,
      pageSize,
    );

    return NextResponse.json({
      history,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('获取积分历史失败:', error);
    return NextResponse.json({ error: '获取积分历史失败' }, { status: 500 });
  }
}
