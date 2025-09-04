import { NextRequest, NextResponse } from 'next/server';

// 常用的视频解析接口列表
const PARSERS = [
  {
    name: '解析接口1',
    url: 'https://jx.xmflv.com/?url=',
    platforms: ['qq', 'iqiyi', 'youku', 'mgtv', 'bilibili']
  },
  {
    name: '解析接口2', 
    url: 'https://www.8090g.cn/?url=',
    platforms: ['qq', 'iqiyi', 'youku', 'mgtv', 'letv']
  },
  {
    name: '解析接口3',
    url: 'https://jx.playerjy.com/?url=',
    platforms: ['qq', 'iqiyi', 'youku', 'sohu', 'letv']
  },
  {
    name: '解析接口4',
    url: 'https://jx.m3u8.tv/jiexi/?url=',
    platforms: ['qq', 'iqiyi', 'youku', 'mgtv', 'bilibili', 'pptv']
  },
  {
    name: '解析接口5',
    url: 'https://api.subaibai.com/?url=',
    platforms: ['qq', 'iqiyi', 'youku', 'mgtv', 'bilibili']
  }
];

// 根据URL识别视频平台
function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('qq.com') || urlLower.includes('v.qq.com')) return 'qq';
  if (urlLower.includes('iqiyi.com') || urlLower.includes('qiyi.com')) return 'iqiyi';
  if (urlLower.includes('youku.com')) return 'youku';
  if (urlLower.includes('mgtv.com')) return 'mgtv';
  if (urlLower.includes('bilibili.com')) return 'bilibili';
  if (urlLower.includes('sohu.com')) return 'sohu';
  if (urlLower.includes('letv.com') || urlLower.includes('le.com')) return 'letv';
  if (urlLower.includes('pptv.com')) return 'pptv';
  if (urlLower.includes('tudou.com')) return 'tudou';
  if (urlLower.includes('wasu.com')) return 'wasu';
  if (urlLower.includes('1905.com')) return '1905';
  
  return 'unknown';
}

// 根据平台获取可用的解析器
function getAvailableParsers(platform: string) {
  return PARSERS.filter(parser => 
    parser.platforms.includes(platform) || platform === 'unknown'
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const parser = searchParams.get('parser');
    const format = searchParams.get('format') || 'json';

    if (!url) {
      return NextResponse.json(
        { error: '缺少必需参数: url' },
        { status: 400 }
      );
    }

    // 检测视频平台
    const platform = detectPlatform(url);
    const availableParsers = getAvailableParsers(platform);

    if (availableParsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '该平台暂不支持解析',
        data: {
          original_url: url,
          platform: platform,
          available_parsers: []
        }
      });
    }

    // 选择解析器
    let selectedParser;
    if (parser) {
      selectedParser = availableParsers.find(p => p.name === parser);
      if (!selectedParser) {
        return NextResponse.json({
          success: false,
          error: '指定的解析器不存在或不支持该平台',
          data: {
            original_url: url,
            platform: platform,
            available_parsers: availableParsers.map(p => p.name)
          }
        });
      }
    } else {
      // 使用第一个可用的解析器
      selectedParser = availableParsers[0];
    }

    const parseUrl = selectedParser.url + encodeURIComponent(url);

    // 根据format参数返回不同格式
    switch (format) {
      case 'redirect':
        // 直接重定向到解析地址
        return NextResponse.redirect(parseUrl);
        
      case 'iframe': {
        // 返回可嵌入的iframe HTML
        const iframeHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>视频解析 - LunaTV</title>
    <style>
        body { margin: 0; padding: 0; background: #000; }
        iframe { width: 100vw; height: 100vh; border: none; }
    </style>
</head>
<body>
    <iframe src="${parseUrl}" allowfullscreen></iframe>
</body>
</html>`;
        return new NextResponse(iframeHtml, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
        
      case 'json':
      default:
        // 返回JSON格式的解析信息
        return NextResponse.json({
          success: true,
          data: {
            original_url: url,
            platform: platform,
            parse_url: parseUrl,
            parser_name: selectedParser.name,
            available_parsers: availableParsers.map(p => p.name)
          }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=300'
          }
        });
    }

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: '视频解析服务异常', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// 支持CORS预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}