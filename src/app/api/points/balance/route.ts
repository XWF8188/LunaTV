/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { pointsService } from '@/lib/points.service';

export async function GET(request: NextRequest) {
  try {
    const username = request.headers.get('x-username');
    if (!username) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const balance = await pointsService.getUserBalance(username);
    return NextResponse.json({ balance });
  } catch (error: any) {
    console.error('获取积分余额失败:', error);
    return NextResponse.json(
      { error: error.message || '获取积分余额失败' },
      { status: 500 },
    );
  }
}
