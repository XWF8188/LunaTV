import he from 'he';
import Hls from 'hls.js';

// 使用ArtPlayer的兼容性检测函数
// 参考: ArtPlayer-master/packages/artplayer/src/utils/compatibility.js
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isIOS = /iPad|iPhone|iPod/i.test(userAgent) && !(window as any).MSStream;
const isIOS13 = isIOS || (userAgent.includes('Macintosh') && navigator.maxTouchPoints >= 1);
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || isIOS13;
const isSafari = /^(?:(?!chrome|android).)*safari/i.test(userAgent);

function getDoubanImageProxyConfig(): {
  proxyType:
  | 'direct'
  | 'server'
  | 'img3'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'custom';
  proxyUrl: string;
} {
  const doubanImageProxyType =
    localStorage.getItem('doubanImageProxyType') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
    'cmliussss-cdn-tencent';
  const doubanImageProxy =
    localStorage.getItem('doubanImageProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY ||
    '';
  return {
    proxyType: doubanImageProxyType,
    proxyUrl: doubanImageProxy,
  };
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 仅处理豆瓣图片代理
  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
  switch (proxyType) {
    case 'server':
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    case 'img3':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com');
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.net'
      );
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.com'
      );
    case 'custom':
      return `${proxyUrl}${encodeURIComponent(originalUrl)}`;
    case 'direct':
    default:
      return originalUrl;
  }
}

/**
 * 从m3u8地址获取视频质量等级和网络信息
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
}> {
  try {
    // 检测是否为iPad（无论什么浏览器）
    const isIPad = /iPad/i.test(userAgent);
    
    if (isIPad) {
      // iPad使用最简单的ping测试，不创建任何video或HLS实例
      console.log('iPad检测，使用简化测速避免崩溃');
      
      const startTime = performance.now();
      try {
        await fetch(m3u8Url, { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: AbortSignal.timeout(2000)
        });
        const pingTime = Math.round(performance.now() - startTime);
        
        return {
          quality: '未知', // iPad不检测视频质量避免崩溃
          loadSpeed: '未知', // iPad不检测下载速度
          pingTime
        };
      } catch (error) {
        return {
          quality: '未知',
          loadSpeed: '未知',
          pingTime: 9999
        };
      }
    }
    
    // 非iPad设备使用优化后的测速逻辑
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      
      // 移动设备使用更小的视频元素减少内存占用
      if (isMobile) {
        video.width = 32;
        video.height = 18;
        video.style.display = 'none';
      }

      // 测量ping时间
      const pingStart = performance.now();
      let pingTime = 0;

      const pingPromise = fetch(m3u8Url, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          pingTime = performance.now() - pingStart;
        })
        .catch(() => {
          pingTime = performance.now() - pingStart;
        });

      // 移动设备使用更保守的HLS配置
      const hls = new Hls({
        debug: false,
        enableWorker: false, // 移动设备关闭WebWorker减少内存占用
        lowLatencyMode: false,
        maxBufferLength: isMobile ? 2 : 10,
        maxBufferSize: isMobile ? 1024 * 1024 : 5 * 1024 * 1024,
        backBufferLength: 0,
      });

      const timeoutDuration = isMobile ? 3000 : 4000;
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout loading video metadata'));
      }, timeoutDuration);

      const cleanup = () => {
        clearTimeout(timeout);
        try {
          if (hls) hls.destroy();
        } catch (e) {
          console.warn('HLS cleanup error:', e);
        }
        try {
          if (video && video.parentNode) {
            video.parentNode.removeChild(video);
          } else if (video) {
            video.remove();
          }
        } catch (e) {
          console.warn('Video cleanup error:', e);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };

      let actualLoadSpeed = '未知';
      let hasSpeedCalculated = false;
      let hasMetadataLoaded = false;
      let fragmentStartTime = 0;

      const checkAndResolve = async () => {
        if (hasMetadataLoaded && (hasSpeedCalculated || actualLoadSpeed !== '未知')) {
          await pingPromise;
          
          const width = video.videoWidth;
          let quality = '未知';
          
          if (width && width > 0) {
            quality = width >= 3840 ? '4K'
              : width >= 2560 ? '2K'
              : width >= 1920 ? '1080p'
              : width >= 1280 ? '720p'
              : width >= 854 ? '480p'
              : 'SD';
          }

          cleanup();
          resolve({
            quality,
            loadSpeed: actualLoadSpeed,
            pingTime: Math.round(pingTime),
          });
        }
      };

      // 监听片段加载
      hls.on(Hls.Events.FRAG_LOADING, () => {
        if (!hasSpeedCalculated) {
          fragmentStartTime = performance.now();
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (event: any, data: any) => {
        if (fragmentStartTime > 0 && data && data.payload && !hasSpeedCalculated) {
          const loadTime = performance.now() - fragmentStartTime;
          const size = data.payload.byteLength || 0;

          if (loadTime > 0 && size > 0) {
            const speedKBps = size / 1024 / (loadTime / 1000);
            actualLoadSpeed = speedKBps >= 1024
              ? `${(speedKBps / 1024).toFixed(2)} MB/s`
              : `${speedKBps.toFixed(2)} KB/s`;
            hasSpeedCalculated = true;
            checkAndResolve();
          }
        }
      });

      // 监听视频元数据加载完成
      video.addEventListener('loadedmetadata', () => {
        hasMetadataLoaded = true;
        checkAndResolve();
      });

      // 监听HLS错误
      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        console.warn('HLS测速错误:', data);
        if (data.fatal) {
          cleanup();
          reject(new Error(`HLS Error: ${data.type} - ${data.details}`));
        }
      });

      // 加载m3u8
      try {
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  } catch (error) {
    throw new Error(`测速失败: ${error}`);
  }
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}
