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

    const usersPoints = await PointsService.getAllUsersPoints();

    return NextResponse.json({ users: usersPoints });
  } catch (error) {
    console.error('获取用户积分列表失败:', error);
    return NextResponse.json(
      { error: '获取用户积分列表失败' },
      { status: 500 },
    );
  }
}
