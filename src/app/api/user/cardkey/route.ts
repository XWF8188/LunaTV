/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { cardKeyService } from '@/lib/cardkey';

export const runtime = 'nodejs';

// GET - 获取当前卡密状态
export async function GET(request: NextRequest) {
  try {
    console.log('=== GET /api/user/cardkey 开始 ===');
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    console.log('storageType:', storageType);

    if (storageType === 'localstorage') {
      console.log('不支持本地存储');
      return NextResponse.json({ error: '不支持本地存储' }, { status: 400 });
    }

    // 验证用户登录
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      console.log('用户未登录');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;
    console.log('username:', username);

    // 获取用户卡密信息
    const cardKeyInfo = await cardKeyService.getUserCardKey(username);
    console.log('cardKeyInfo:', JSON.stringify(cardKeyInfo, null, 2));

    if (!cardKeyInfo) {
      console.log('用户没有绑定卡密');
      return NextResponse.json(
        { hasCardKey: false },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    console.log('返回卡密信息成功');
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
    console.error('错误堆栈:', (error as Error).stack);
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
    console.log('=== POST /api/user/cardkey 开始 ===');
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    console.log('storageType:', storageType);

    if (storageType === 'localstorage') {
      console.log('不支持本地存储');
      return NextResponse.json({ error: '不支持本地存储' }, { status: 400 });
    }

    // 验证用户登录
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      console.log('用户未登录');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;
    console.log('username:', username);

    const body = await request.json();
    const { cardKey } = body;
    console.log('cardKey:', cardKey);

    if (!cardKey) {
      console.log('缺少卡密参数');
      return NextResponse.json({ error: '缺少卡密' }, { status: 400 });
    }

    // 绑定卡密
    const result = await cardKeyService.bindCardKeyToUser(cardKey, username);
    console.log('绑定结果:', result);

    if (!result.success) {
      console.log('绑定失败:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 获取新的卡密信息
    const cardKeyInfo = await cardKeyService.getUserCardKey(username);
    console.log('绑定后卡密信息:', JSON.stringify(cardKeyInfo, null, 2));

    console.log('绑定成功,返回结果');
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
    console.error('错误堆栈:', (error as Error).stack);
    return NextResponse.json(
      {
        error: '绑定卡密失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
