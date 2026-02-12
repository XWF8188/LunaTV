/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { cardKeyService } from '@/lib/cardkey';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    if (storageType === 'localstorage') {
      return NextResponse.json(
        { error: '不支持本地存储进行卡密管理' },
        { status: 400 },
      );
    }

    // 验证管理员权限
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;

    // 检查是否为管理员
    const config = await getConfig();
    let isAdmin = false;

    if (username === process.env.USERNAME) {
      isAdmin = true;
    } else {
      const user = config.UserConfig.Users.find((u) => u.username === username);
      if (user && user.role === 'admin' && !user.banned) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 401 });
    }

    // 导出卡密列表
    const csvContent = await cardKeyService.exportCardKeys();

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cardkeys-${Date.now()}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('导出卡密失败:', error);
    return NextResponse.json(
      {
        error: '导出卡密失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
