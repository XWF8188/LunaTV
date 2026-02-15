/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { InvitationService } from '@/lib/invitation-points';

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

    const info = await InvitationService.getUserInvitationInfo(
      authInfo.username,
    );

    return NextResponse.json(info);
  } catch (error) {
    console.error('获取邀请信息失败:', error);
    return NextResponse.json({ error: '获取邀请信息失败' }, { status: 500 });
  }
}
