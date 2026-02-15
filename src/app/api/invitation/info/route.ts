/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { invitationService } from '@/lib/invitation.service';

export async function GET(request: NextRequest) {
  try {
    const username = request.headers.get('x-username');
    if (!username) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const info = await invitationService.getUserInvitationInfo(username);
    return NextResponse.json(info);
  } catch (error: any) {
    console.error('获取邀请信息失败:', error);
    return NextResponse.json(
      { error: error.message || '获取邀请信息失败' },
      { status: 500 },
    );
  }
}
