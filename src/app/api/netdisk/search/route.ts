import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: '搜索关键词不能为空' }, { status: 400 });
  }

  const config = await getConfig();
  const netDiskConfig = config.NetDiskConfig;

  // 检查是否启用网盘搜索
  if (!netDiskConfig?.enabled) {
    return NextResponse.json({ error: '网盘搜索功能未启用' }, { status: 400 });
  }

  if (!netDiskConfig?.pansouUrl) {
    return NextResponse.json({ error: 'PanSou服务地址未配置' }, { status: 400 });
  }

  try {
    // 调用PanSou服务
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (netDiskConfig.timeout || 30) * 1000);

    const pansouResponse = await fetch(`${netDiskConfig.pansouUrl}/api/search`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'LunaTV/1.0'
      },
      signal: controller.signal,
      body: JSON.stringify({
        kw: query,
        res: 'merge',
        cloud_types: netDiskConfig.enabledCloudTypes || ['baidu', 'aliyun', 'quark', 'tianyi', 'uc']
      })
    });

    clearTimeout(timeout);

    if (!pansouResponse.ok) {
      throw new Error(`PanSou服务响应错误: ${pansouResponse.status} ${pansouResponse.statusText}`);
    }

    const result = await pansouResponse.json();
    
    // 统一返回格式
    return NextResponse.json({
      success: true,
      data: {
        total: result.data?.total || 0,
        merged_by_type: result.data?.merged_by_type || {},
        source: 'pansou',
        query: query,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('网盘搜索失败:', error);
    
    let errorMessage = '网盘搜索失败';
    if (error.name === 'AbortError') {
      errorMessage = '网盘搜索请求超时';
    } else if (error.message) {
      errorMessage = `网盘搜索失败: ${error.message}`;
    }

    return NextResponse.json({ 
      success: false,
      error: errorMessage,
      suggestion: '请检查PanSou服务是否正常运行或联系管理员'
    }, { status: 500 });
  }
}