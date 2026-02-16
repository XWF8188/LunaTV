/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { cardKeyService } from '@/lib/cardkey';

export const runtime = 'nodejs';

// GET - 获取卡密列表
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

    // 获取所有卡密
    const cardKeys = await cardKeyService.getAllCardKeys();

    return NextResponse.json(
      { cardKeys },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('获取卡密列表失败:', error);
    return NextResponse.json(
      {
        error: '获取卡密列表失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

// POST - 创建卡密或执行其他操作
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, type, count } = body;

    // 创建卡密
    if (action === 'create') {
      if (!type) {
        return NextResponse.json({ error: '缺少卡密类型' }, { status: 400 });
      }

      const result = await cardKeyService.createCardKey(type, count || 1);

      return NextResponse.json(
        { ok: true, result },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    // 清理过期卡密
    if (action === 'cleanup') {
      const cleanedCount = await cardKeyService.cleanupExpiredCardKeys();

      return NextResponse.json(
        { ok: true, cleanedCount },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    return NextResponse.json({ error: '未知的操作' }, { status: 400 });
  } catch (error) {
    console.error('卡密操作失败:', error);
    return NextResponse.json(
      {
        error: '卡密操作失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

// DELETE - 删除卡密
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');

    if (!hash) {
      return NextResponse.json({ error: '缺少卡密哈希' }, { status: 400 });
    }

    const success = await cardKeyService.deleteUnusedCardKey(hash);

    if (success) {
      return NextResponse.json(
        { ok: true },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    } else {
      return NextResponse.json({ error: '删除卡密失败' }, { status: 400 });
    }
  } catch (error) {
    console.error('删除卡密失败:', error);
    return NextResponse.json(
      {
        error: '删除卡密失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
