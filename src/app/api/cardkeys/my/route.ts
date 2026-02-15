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

    const cardKeys = await db.storage.getUserCardKeys(authInfo.username);

    return NextResponse.json({ cardKeys });
  } catch (error) {
    console.error('获取用户卡密列表失败:', error);
    return NextResponse.json(
      { error: '获取用户卡密列表失败' },
      { status: 500 },
    );
  }
}
