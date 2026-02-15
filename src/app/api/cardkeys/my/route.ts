/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { cardKeyService } from '@/lib/cardkey';

export async function GET(request: NextRequest) {
  try {
    const username = request.headers.get('x-username');
    if (!username) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const cardKeys = await cardKeyService.getUserCardKeys(username);
    return NextResponse.json({ cardKeys });
  } catch (error: any) {
    console.error('获取我的卡密失败:', error);
    return NextResponse.json(
      { error: error.message || '获取我的卡密失败' },
      { status: 500 },
    );
  }
}
