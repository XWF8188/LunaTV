/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { invitationService } from '@/lib/invitation.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: '邀请码不能为空' }, { status: 400 });
    }

    const result = await invitationService.validateInvitationCode(code);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('验证邀请码失败:', error);
    return NextResponse.json(
      { error: error.message || '验证邀请码失败' },
      { status: 500 },
    );
  }
}
