/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { invitationConfigService } from '@/lib/invitation-config.service';

export async function GET() {
  try {
    const config = await invitationConfigService.getConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('获取邀请配置失败:', error);
    return NextResponse.json(
      { error: error.message || '获取邀请配置失败' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    await invitationConfigService.updateConfig(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('更新邀请配置失败:', error);
    return NextResponse.json(
      { error: error.message || '更新邀请配置失败' },
      { status: 500 },
    );
  }
}
