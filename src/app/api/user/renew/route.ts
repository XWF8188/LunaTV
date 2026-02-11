import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { ActivationCodeService } from '@/lib/activation-code-service';
import { UserExpirationService } from '@/lib/user-expiration-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;
    const canBypassExpiration =
      await UserExpirationService.canBypassExpirationCheck(username);

    if (canBypassExpiration) {
      return NextResponse.json(
        { error: '管理员账号无需续期' },
        { status: 400 },
      );
    }

    const { activationCode } = await req.json();

    if (!activationCode || typeof activationCode !== 'string') {
      return NextResponse.json({ error: '请输入卡密' }, { status: 400 });
    }

    const isValidCode =
      await ActivationCodeService.validateCode(activationCode);
    if (!isValidCode) {
      return NextResponse.json({ error: '无效的卡密' }, { status: 400 });
    }

    await ActivationCodeService.useCode(activationCode, username);

    const config = await getConfig();
    const validityDays =
      config.ActivationCodeConfig?.defaultValidityDays || 365;

    const newExpirationDate = await UserExpirationService.renewAccount(
      username,
      activationCode,
      username,
      validityDays,
    );

    const expirationInfo =
      await UserExpirationService.checkExpiration(username);

    return NextResponse.json({
      ok: true,
      newExpirationDate: newExpirationDate.toISOString(),
      expirationInfo,
    });
  } catch (error) {
    console.error('续期失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '续期失败，请稍后重试';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;
    const canBypassExpiration =
      await UserExpirationService.canBypassExpirationCheck(username);

    if (canBypassExpiration) {
      return NextResponse.json({
        ok: true,
        expirationInfo: null,
        renewalHistory: [],
      });
    }

    const expirationInfo =
      await UserExpirationService.checkExpiration(username);
    const renewalHistory =
      await UserExpirationService.getRenewalHistory(username);

    return NextResponse.json({
      ok: true,
      expirationInfo,
      renewalHistory,
    });
  } catch (error) {
    console.error('获取续期信息失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
