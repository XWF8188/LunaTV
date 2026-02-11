import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { ActivationCodeService } from '@/lib/activation-code-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;

    const { action, count } = await req.json();

    if (action === 'generate') {
      const generateCount = count || 1;

      if (generateCount < 1 || generateCount > 1000) {
        return NextResponse.json(
          { error: '单次生成数量不能超过 1000' },
          { status: 400 },
        );
      }

      const codes = await ActivationCodeService.createCodes(
        generateCount,
        username,
      );

      return NextResponse.json({
        ok: true,
        codes,
        count: codes.length,
      });
    }

    return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
  } catch (error) {
    console.error('创建卡密失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '创建卡密失败，请稍后重试';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const codes = await ActivationCodeService.getAllCodes();

    return NextResponse.json({
      ok: true,
      codes,
      total: codes.length,
    });
  } catch (error) {
    console.error('获取卡密列表失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
