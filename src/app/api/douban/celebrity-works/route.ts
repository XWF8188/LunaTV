import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { db } from '@/lib/db';
import { fetchDoubanWithVerification } from '@/lib/douban-anti-crawler';
import { getRandomUserAgentWithInfo, getSecChUaHeaders } from '@/lib/user-agent';

// 缓存时间：2小时
const CELEBRITY_WORKS_CACHE_TIME = 2 * 60 * 60;

// 请求限制器
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2秒最小间隔

function randomDelay(min = 500, max = 1500): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 获取参数
  const celebrityName = searchParams.get('name');
  const pageLimit = parseInt(searchParams.get('limit') || '20');
  const pageStart = parseInt(searchParams.get('start') || '0');

  // 验证参数
  if (!celebrityName?.trim()) {
    return NextResponse.json(
      { error: '缺少必要参数: name（演员名字）' },
      { status: 400 }
    );
  }

  if (pageLimit < 1 || pageLimit > 50) {
    return NextResponse.json(
      { error: 'limit 必须在 1-50 之间' },
      { status: 400 }
    );
  }

  try {
    // 生成缓存 key
    const cacheKey = `douban-celebrity-works-${celebrityName.trim()}-${pageLimit}-${pageStart}`;

    console.log(`🔍 [豆瓣演员作品API] 检查缓存: ${cacheKey}`);

    // 检查缓存
    try {
      const cachedResult = await db.getCache(cacheKey);
      if (cachedResult) {
        console.log(`✅ [豆瓣演员作品API] 缓存命中: ${celebrityName} - ${cachedResult.works?.length || 0} 项`);
        return NextResponse.json(cachedResult);
      }
      console.log(`❌ [豆瓣演员作品API] 缓存未命中，开始搜索...`);
    } catch (cacheError) {
      console.warn('豆瓣演员作品缓存检查失败:', cacheError);
    }

    // 请求限流：确保请求间隔
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve =>
        setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    lastRequestTime = Date.now();

    // 添加随机延时
    await randomDelay(500, 1500);

    // 构建豆瓣搜索 URL（固定使用 movie 类型）
    const searchUrl = `https://movie.douban.com/j/search_subjects?type=movie&tag=${encodeURIComponent(celebrityName.trim())}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;

    console.log(`[豆瓣演员作品API] 请求: ${searchUrl}`);

    // 获取随机浏览器指纹
    const { ua, browser, platform } = getRandomUserAgentWithInfo();
    const secChHeaders = getSecChUaHeaders(browser, platform);

    // 使用反爬虫请求
    const response = await fetchDoubanWithVerification(searchUrl, {
      headers: {
        'User-Agent': ua,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://movie.douban.com/explore',
        'Origin': 'https://movie.douban.com',
        ...secChHeaders,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    if (!response.ok) {
      throw new Error(`豆瓣 API 请求失败: ${response.status}`);
    }

    const data = await response.json();

    // 转换数据格式
    const works = (data.subjects || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      poster: item.cover,
      rate: item.rate || '',
      url: item.url,
      source: 'douban'
    }));

    const result = {
      success: true,
      celebrityName: celebrityName.trim(),
      works,
      total: works.length,
    };

    console.log(`[豆瓣演员作品API] 找到 ${works.length} 部作品`);

    // 缓存结果
    try {
      await db.setCache(cacheKey, result, CELEBRITY_WORKS_CACHE_TIME);
      console.log(`💾 [豆瓣演员作品API] 结果已缓存: "${celebrityName}" - ${works.length} 项, TTL: ${CELEBRITY_WORKS_CACHE_TIME}s`);
    } catch (cacheError) {
      console.warn('豆瓣演员作品缓存保存失败:', cacheError);
    }

    // 返回结果
    const cacheTime = await getCacheTime();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
      },
    });
  } catch (error) {
    console.error(`[豆瓣演员作品API] 搜索失败: ${celebrityName}`, (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: '豆瓣演员作品搜索失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
