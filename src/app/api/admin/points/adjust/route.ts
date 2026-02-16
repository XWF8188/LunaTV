/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { PointsService } from '@/lib/invitation-points';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { username, type, amount, reason } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: '请提供用户名' }, { status: 400 });
    }

    if (type !== 'add' && type !== 'deduct') {
      return NextResponse.json({ error: '操作类型无效' }, { status: 400 });
    }

    if (
      typeof amount !== 'number' ||
      amount <= 0 ||
      !Number.isInteger(amount)
    ) {
      return NextResponse.json(
        { error: '积分数量必须为正整数' },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: '请输入调整原因' }, { status: 400 });
    }

    if (reason.length > 200) {
      return NextResponse.json(
        { error: '调整原因不能超过200字符' },
        { status: 400 },
      );
    }

    const result = await PointsService.adjustPoints(
      username,
      type,
      amount,
      reason.trim(),
      authInfo.username,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('调整积分失败:', error);
    return NextResponse.json({ error: '调整积分失败' }, { status: 500 });
  }
}
