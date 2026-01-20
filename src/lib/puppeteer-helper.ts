import puppeteer, { Browser, Page } from 'puppeteer';

import { getRandomUserAgent } from './user-agent';

let browserInstance: Browser | null = null;

/**
 * 获取或创建浏览器实例（单例模式）
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    console.log('[Puppeteer] 启动浏览器实例...');
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    });
  }
  return browserInstance;
}

/**
 * 使用 Puppeteer 获取豆瓣页面内容（绕过反爬虫）
 */
export async function fetchWithPuppeteer(url: string): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // 使用最新的随机 User-Agent
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);
    console.log(`[Puppeteer] 使用 User-Agent: ${userAgent.substring(0, 50)}...`);

    // 隐藏 webdriver 特征
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    console.log(`[Puppeteer] 访问页面: ${url}`);

    // 访问页面
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    console.log('[Puppeteer] 初始页面加载完成');

    // 等待可能的自动提交和导航
    try {
      await page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      console.log('[Puppeteer] 检测到页面导航，已完成');
    } catch (navError) {
      // 未检测到导航或导航超时，可能直接是真实页面
      console.log('[Puppeteer] 未检测到导航（可能直接是真实页面）');
    }

    // 等待页面稳定
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 获取最终页面内容
    const html = await page.content();
    console.log(`[Puppeteer] 成功获取页面，长度: ${html.length}`);

    return html;
  } finally {
    await page.close();
  }
}

/**
 * 关闭浏览器实例（优雅关闭）
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('[Puppeteer] 关闭浏览器实例');
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * 检测是否为豆瓣 challenge 页面
 */
export function isDoubanChallengePage(html: string): boolean {
  return (
    html.includes('sha512') &&
    html.includes('process(cha)') &&
    html.includes('载入中')
  );
}
