/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { pointsService } from '@/lib/points.service';

export async function POST(request: NextRequest) {
  try {
    const username = request.headers.get('x-username');
    if (!username) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const result = await pointsService.redeemForCardKey(username);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('兑换卡密失败:', error);
    return NextResponse.json(
      { error: error.message || '兑换卡密失败' },
      { status: 500 },
    );
  }
}
