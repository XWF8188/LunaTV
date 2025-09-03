/* eslint-disable @typescript-eslint/no-explicit-any,no-console,no-case-declarations */

import { DoubanItem, DoubanResult } from './types';

// 豆瓣数据缓存配置
const DOUBAN_CACHE_EXPIRE = {
  details: 4 * 60 * 60 * 1000,  // 详情4小时（变化较少）
  lists: 2 * 60 * 60 * 1000,   // 列表2小时（更新频繁）
  categories: 2 * 60 * 60 * 1000, // 分类2小时
  recommends: 2 * 60 * 60 * 1000, // 推荐2小时
};

// 缓存工具函数
function getCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `douban-${prefix}-${sortedParams}`;
}

function getCache(key: string): any | null {
  if (typeof localStorage === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, expire } = JSON.parse(cached);
    if (Date.now() > expire) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (e) {
    localStorage.removeItem(key);
    return null;
  }
}

function setCache(key: string, data: any, expireTime: number): void {
  if (typeof localStorage === 'undefined') return;
  
  try {
    const cacheData = {
      data,
      expire: Date.now() + expireTime,
      created: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Failed to set cache:', e);
  }
}

// 清理过期缓存（包括bangumi缓存）
function cleanExpiredCache(): void {
  if (typeof localStorage === 'undefined') return;
  
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith('douban-') || key.startsWith('bangumi-')
  );
  let cleanedCount = 0;
  
  keys.forEach(key => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { expire } = JSON.parse(cached);
        if (Date.now() > expire) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    } catch (e) {
      // 清理损坏的缓存数据
      localStorage.removeItem(key);
      cleanedCount++;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`清理了 ${cleanedCount} 个过期缓存（豆瓣+Bangumi）`);
  }
}

// 获取缓存状态信息（包括bangumi）
export function getDoubanCacheStats(): {
  totalItems: number;
  totalSize: number;
  byType: Record<string, number>;
} {
  if (typeof localStorage === 'undefined') {
    return { totalItems: 0, totalSize: 0, byType: {} };
  }
  
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith('douban-') || key.startsWith('bangumi-')
  );
  const byType: Record<string, number> = {};
  let totalSize = 0;
  
  keys.forEach(key => {
    const type = key.split('-')[1]; // douban-{type}-{params} 或 bangumi-{type}
    byType[type] = (byType[type] || 0) + 1;
    
    const data = localStorage.getItem(key);
    if (data) {
      totalSize += data.length;
    }
  });
  
  return {
    totalItems: keys.length,
    totalSize,
    byType
  };
}

// 清理所有缓存（豆瓣+bangumi）
export function clearDoubanCache(): void {
  if (typeof localStorage === 'undefined') return;
  
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith('douban-') || key.startsWith('bangumi-')
  );
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`清理了 ${keys.length} 个缓存项（豆瓣+Bangumi）`);
}

// 初始化缓存系统（应该在应用启动时调用）
export function initDoubanCache(): void {
  if (typeof window === 'undefined') return;
  
  // 立即清理一次过期缓存
  cleanExpiredCache();
  
  // 每10分钟清理一次过期缓存
  setInterval(cleanExpiredCache, 10 * 60 * 1000);
  
  console.log('缓存系统已初始化（豆瓣+Bangumi）');
}

interface DoubanCategoriesParams {
  kind: 'tv' | 'movie';
  category: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

interface DoubanCategoryApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

interface DoubanListApiResponse {
  total: number;
  subjects: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    cover: string;
    rate: string;
  }>;
}

interface DoubanRecommendApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    year: string;
    type: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

/**
 * 带超时的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  proxyUrl: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  // 检查是否使用代理
  const finalUrl =
    proxyUrl === 'https://cors-anywhere.com/'
      ? `${proxyUrl}${url}`
      : proxyUrl
        ? `${proxyUrl}${encodeURIComponent(url)}`
        : url;

  const fetchOptions: RequestInit = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
    },
  };

  try {
    const response = await fetch(finalUrl, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function getDoubanProxyConfig(): {
  proxyType:
  | 'direct'
  | 'cors-proxy-zwei'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'cors-anywhere'
  | 'custom';
  proxyUrl: string;
} {
  const doubanProxyType =
    localStorage.getItem('doubanDataSource') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
    'cmliussss-cdn-tencent';
  const doubanProxy =
    localStorage.getItem('doubanProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY ||
    '';
  return {
    proxyType: doubanProxyType,
    proxyUrl: doubanProxy,
  };
}

/**
 * 浏览器端豆瓣分类数据获取函数
 */
export async function fetchDoubanCategories(
  params: DoubanCategoriesParams,
  proxyUrl: string,
  useTencentCDN = false,
  useAliCDN = false
): Promise<DoubanResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;

  // 验证参数
  if (!['tv', 'movie'].includes(kind)) {
    throw new Error('kind 参数必须是 tv 或 movie');
  }

  if (!category || !type) {
    throw new Error('category 和 type 参数不能为空');
  }

  if (pageLimit < 1 || pageLimit > 100) {
    throw new Error('pageLimit 必须在 1-100 之间');
  }

  if (pageStart < 0) {
    throw new Error('pageStart 不能小于 0');
  }

  const target = useTencentCDN
    ? `https://m.douban.cmliussss.net/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`
    : useAliCDN
      ? `https://m.douban.cmliussss.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`
      : `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`;

  try {
    const response = await fetchWithTimeout(
      target,
      useTencentCDN || useAliCDN ? '' : proxyUrl
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanCategoryApiResponse = await response.json();

    // 转换数据格式
    const list: DoubanItem[] = doubanData.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    return {
      code: 200,
      message: '获取成功',
      list: list,
    };
  } catch (error) {
    // 触发全局错误提示
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('globalError', {
          detail: { message: '获取豆瓣分类数据失败' },
        })
      );
    }
    throw new Error(`获取豆瓣分类数据失败: ${(error as Error).message}`);
  }
}

/**
 * 统一的豆瓣分类数据获取函数，根据代理设置选择使用服务端 API 或客户端代理获取
 */
export async function getDoubanCategories(
  params: DoubanCategoriesParams
): Promise<DoubanResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;
  
  // 检查缓存
  const cacheKey = getCacheKey('categories', { kind, category, type, pageLimit, pageStart });
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`豆瓣分类缓存命中: ${kind}/${category}/${type}`);
    return cached;
  }
  
  const { proxyType, proxyUrl } = getDoubanProxyConfig();
  let result: DoubanResult;
  
  switch (proxyType) {
    case 'cors-proxy-zwei':
      result = await fetchDoubanCategories(params, 'https://ciao-cors.is-an.org/');
      break;
    case 'cmliussss-cdn-tencent':
      result = await fetchDoubanCategories(params, '', true, false);
      break;
    case 'cmliussss-cdn-ali':
      result = await fetchDoubanCategories(params, '', false, true);
      break;
    case 'cors-anywhere':
      result = await fetchDoubanCategories(params, 'https://cors-anywhere.com/');
      break;
    case 'custom':
      result = await fetchDoubanCategories(params, proxyUrl);
      break;
    case 'direct':
    default:
      const response = await fetch(
        `/api/douban/categories?kind=${kind}&category=${category}&type=${type}&limit=${pageLimit}&start=${pageStart}`
      );
      result = await response.json();
      break;
  }
  
  // 保存到缓存
  if (result.code === 200) {
    setCache(cacheKey, result, DOUBAN_CACHE_EXPIRE.categories);
    console.log(`豆瓣分类已缓存: ${kind}/${category}/${type}`);
  }
  
  return result;
}

interface DoubanListParams {
  tag: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

export async function getDoubanList(
  params: DoubanListParams
): Promise<DoubanResult> {
  const { tag, type, pageLimit = 20, pageStart = 0 } = params;
  
  // 检查缓存
  const cacheKey = getCacheKey('lists', { tag, type, pageLimit, pageStart });
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`豆瓣列表缓存命中: ${type}/${tag}/${pageStart}`);
    return cached;
  }
  
  const { proxyType, proxyUrl } = getDoubanProxyConfig();
  let result: DoubanResult;
  
  switch (proxyType) {
    case 'cors-proxy-zwei':
      result = await fetchDoubanList(params, 'https://ciao-cors.is-an.org/');
      break;
    case 'cmliussss-cdn-tencent':
      result = await fetchDoubanList(params, '', true, false);
      break;
    case 'cmliussss-cdn-ali':
      result = await fetchDoubanList(params, '', false, true);
      break;
    case 'cors-anywhere':
      result = await fetchDoubanList(params, 'https://cors-anywhere.com/');
      break;
    case 'custom':
      result = await fetchDoubanList(params, proxyUrl);
      break;
    case 'direct':
    default:
      const response = await fetch(
        `/api/douban?tag=${tag}&type=${type}&pageSize=${pageLimit}&pageStart=${pageStart}`
      );
      result = await response.json();
      break;
  }
  
  // 保存到缓存
  if (result.code === 200) {
    setCache(cacheKey, result, DOUBAN_CACHE_EXPIRE.lists);
    console.log(`豆瓣列表已缓存: ${type}/${tag}/${pageStart}`);
  }
  
  return result;
}

export async function fetchDoubanList(
  params: DoubanListParams,
  proxyUrl: string,
  useTencentCDN = false,
  useAliCDN = false
): Promise<DoubanResult> {
  const { tag, type, pageLimit = 20, pageStart = 0 } = params;

  // 验证参数
  if (!tag || !type) {
    throw new Error('tag 和 type 参数不能为空');
  }

  if (!['tv', 'movie'].includes(type)) {
    throw new Error('type 参数必须是 tv 或 movie');
  }

  if (pageLimit < 1 || pageLimit > 100) {
    throw new Error('pageLimit 必须在 1-100 之间');
  }

  if (pageStart < 0) {
    throw new Error('pageStart 不能小于 0');
  }

  const target = useTencentCDN
    ? `https://movie.douban.cmliussss.net/j/search_subjects?type=${type}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`
    : useAliCDN
      ? `https://movie.douban.cmliussss.com/j/search_subjects?type=${type}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`
      : `https://movie.douban.com/j/search_subjects?type=${type}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;

  try {
    const response = await fetchWithTimeout(
      target,
      useTencentCDN || useAliCDN ? '' : proxyUrl
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanListApiResponse = await response.json();

    // 转换数据格式
    const list: DoubanItem[] = doubanData.subjects.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.cover,
      rate: item.rate,
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    return {
      code: 200,
      message: '获取成功',
      list: list,
    };
  } catch (error) {
    // 触发全局错误提示
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('globalError', {
          detail: { message: '获取豆瓣列表数据失败' },
        })
      );
    }
    throw new Error(`获取豆瓣分类数据失败: ${(error as Error).message}`);
  }
}

interface DoubanRecommendsParams {
  kind: 'tv' | 'movie';
  pageLimit?: number;
  pageStart?: number;
  category?: string;
  format?: string;
  label?: string;
  region?: string;
  year?: string;
  platform?: string;
  sort?: string;
}

export async function getDoubanRecommends(
  params: DoubanRecommendsParams
): Promise<DoubanResult> {
  const {
    kind,
    pageLimit = 20,
    pageStart = 0,
    category,
    format,
    label,
    region,
    year,
    platform,
    sort,
  } = params;
  
  // 检查缓存
  const cacheKey = getCacheKey('recommends', { 
    kind, pageLimit, pageStart, category, format, label, region, year, platform, sort 
  });
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`豆瓣推荐缓存命中: ${kind}/${category || 'all'}`);
    return cached;
  }
  
  const { proxyType, proxyUrl } = getDoubanProxyConfig();
  let result: DoubanResult;
  
  switch (proxyType) {
    case 'cors-proxy-zwei':
      result = await fetchDoubanRecommends(params, 'https://ciao-cors.is-an.org/');
      break;
    case 'cmliussss-cdn-tencent':
      result = await fetchDoubanRecommends(params, '', true, false);
      break;
    case 'cmliussss-cdn-ali':
      result = await fetchDoubanRecommends(params, '', false, true);
      break;
    case 'cors-anywhere':
      result = await fetchDoubanRecommends(params, 'https://cors-anywhere.com/');
      break;
    case 'custom':
      result = await fetchDoubanRecommends(params, proxyUrl);
      break;
    case 'direct':
    default:
      const response = await fetch(
        `/api/douban/recommends?kind=${kind}&limit=${pageLimit}&start=${pageStart}&category=${category}&format=${format}&region=${region}&year=${year}&platform=${platform}&sort=${sort}&label=${label}`
      );
      result = await response.json();
      break;
  }
  
  // 保存到缓存
  if (result.code === 200) {
    setCache(cacheKey, result, DOUBAN_CACHE_EXPIRE.recommends);
    console.log(`豆瓣推荐已缓存: ${kind}/${category || 'all'}`);
  }
  
  return result;
}

/**
 * 获取豆瓣影片详细信息
 */
export async function getDoubanDetails(id: string): Promise<{
  code: number;
  message: string;
  data?: {
    id: string;
    title: string;
    poster: string;
    rate: string;
    year: string;
    directors?: string[];
    screenwriters?: string[];
    cast?: string[];
    genres?: string[];
    countries?: string[];
    languages?: string[];
    episodes?: number;
    episode_length?: number;
    first_aired?: string;
    plot_summary?: string;
  };
}> {
  // 检查缓存
  const cacheKey = getCacheKey('details', { id });
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`豆瓣详情缓存命中: ${id}`);
    return cached;
  }
  
  try {
    const response = await fetch(`/api/douban/details?id=${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // 保存到缓存
    if (result.code === 200) {
      setCache(cacheKey, result, DOUBAN_CACHE_EXPIRE.details);
      console.log(`豆瓣详情已缓存: ${id}`);
    }
    
    return result;
  } catch (error) {
    return {
      code: 500,
      message: `获取豆瓣详情失败: ${(error as Error).message}`,
    };
  }
}

async function fetchDoubanRecommends(
  params: DoubanRecommendsParams,
  proxyUrl: string,
  useTencentCDN = false,
  useAliCDN = false
): Promise<DoubanResult> {
  const { kind, pageLimit = 20, pageStart = 0 } = params;
  let { category, format, region, year, platform, sort, label } = params;
  if (category === 'all') {
    category = '';
  }
  if (format === 'all') {
    format = '';
  }
  if (label === 'all') {
    label = '';
  }
  if (region === 'all') {
    region = '';
  }
  if (year === 'all') {
    year = '';
  }
  if (platform === 'all') {
    platform = '';
  }
  if (sort === 'T') {
    sort = '';
  }

  const selectedCategories = { 类型: category } as any;
  if (format) {
    selectedCategories['形式'] = format;
  }
  if (region) {
    selectedCategories['地区'] = region;
  }

  const tags = [] as Array<string>;
  if (category) {
    tags.push(category);
  }
  if (!category && format) {
    tags.push(format);
  }
  if (label) {
    tags.push(label);
  }
  if (region) {
    tags.push(region);
  }
  if (year) {
    tags.push(year);
  }
  if (platform) {
    tags.push(platform);
  }

  const baseUrl = useTencentCDN
    ? `https://m.douban.cmliussss.net/rexxar/api/v2/${kind}/recommend`
    : useAliCDN
      ? `https://m.douban.cmliussss.com/rexxar/api/v2/${kind}/recommend`
      : `https://m.douban.com/rexxar/api/v2/${kind}/recommend`;
  const reqParams = new URLSearchParams();
  reqParams.append('refresh', '0');
  reqParams.append('start', pageStart.toString());
  reqParams.append('count', pageLimit.toString());
  reqParams.append('selected_categories', JSON.stringify(selectedCategories));
  reqParams.append('uncollect', 'false');
  reqParams.append('score_range', '0,10');
  reqParams.append('tags', tags.join(','));
  if (sort) {
    reqParams.append('sort', sort);
  }
  const target = `${baseUrl}?${reqParams.toString()}`;
  console.log(target);
  try {
    const response = await fetchWithTimeout(
      target,
      useTencentCDN || useAliCDN ? '' : proxyUrl
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanRecommendApiResponse = await response.json();
    const list: DoubanItem[] = doubanData.items
      .filter((item) => item.type == 'movie' || item.type == 'tv')
      .map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.pic?.normal || item.pic?.large || '',
        rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
        year: item.year,
      }));

    return {
      code: 200,
      message: '获取成功',
      list: list,
    };
  } catch (error) {
    throw new Error(`获取豆瓣推荐数据失败: ${(error as Error).message}`);
  }
}
