/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { cardKeyService } from '@/lib/cardkey';

export const runtime = 'nodejs';

// GET - 获取当前卡密状态
export async function GET(request: NextRequest) {
  try {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    if (storageType === 'localstorage') {
      return NextResponse.json({ error: '不支持本地存储' }, { status: 400 });
    }

    // 验证用户登录
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;

    // 获取用户卡密信息
    const cardKeyInfo = await cardKeyService.getUserCardKey(username);

    if (!cardKeyInfo) {
      return NextResponse.json(
        { hasCardKey: false },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    return NextResponse.json(
      {
        hasCardKey: true,
        cardKeyInfo,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('获取卡密状态失败:', error);
    return NextResponse.json(
      {
        error: '获取卡密状态失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

// POST - 绑定新卡密
export async function POST(request: NextRequest) {
  try {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    if (storageType === 'localstorage') {
      return NextResponse.json({ error: '不支持本地存储' }, { status: 400 });
    }

    // 验证用户登录
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;

    const body = await request.json();
    const { cardKey } = body;

    if (!cardKey) {
      return NextResponse.json({ error: '缺少卡密' }, { status: 400 });
    }

    // 绑定卡密
    const result = await cardKeyService.bindCardKeyToUser(cardKey, username);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 获取新的卡密信息
    const cardKeyInfo = await cardKeyService.getUserCardKey(username);

    return NextResponse.json(
      {
        ok: true,
        cardKeyInfo,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('绑定卡密失败:', error);
    return NextResponse.json(
      {
        error: '绑定卡密失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
