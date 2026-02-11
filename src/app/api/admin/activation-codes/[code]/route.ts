import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { ActivationCodeService } from '@/lib/activation-code-service';

export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  try {
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const code = params.code;

    if (!code) {
      return NextResponse.json({ error: '卡密不能为空' }, { status: 400 });
    }

    await ActivationCodeService.deleteCode(code);

    return NextResponse.json({
      ok: true,
      message: '卡密删除成功',
    });
  } catch (error) {
    console.error('删除卡密失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '删除卡密失败，请稍后重试';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
