/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { pointsService } from '@/lib/points.service';

export async function GET(request: NextRequest) {
  try {
    const username = request.headers.get('x-username');
    if (!username) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const history = await pointsService.getPointsHistory(
      username,
      page,
      pageSize,
    );
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('获取积分历史失败:', error);
    return NextResponse.json(
      { error: error.message || '获取积分历史失败' },
      { status: 500 },
    );
  }
}
