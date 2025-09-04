'use client';

import { Monitor, Smartphone, Tv } from 'lucide-react';
import { useCallback, useState } from 'react';

import PageLayout from '@/components/PageLayout';

export default function TVBoxConfigPage() {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'json' | 'base64'>('json');

  const getConfigUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/tvbox?format=${format}`;
  }, [format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getConfigUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed silently
    }
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Tv className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                TVBox 配置
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                将 LunaTV 的视频源导入到 TVBox 应用中使用
              </p>
            </div>
          </div>
        </div>

        {/* 配置链接卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            🔗 配置链接
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              格式类型
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'json' | 'base64')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="json">JSON 格式（推荐）</option>
              <option value="base64">Base64 格式</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {format === 'json'
                ? '标准的 JSON 配置文件，便于调试和查看'
                : '编码后的配置，适合某些特殊环境'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={getConfigUrl()}
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${copied
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                } transform hover:scale-105`}
            >
              {copied ? '✓ 已复制' : '复制'}
            </button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            📋 使用说明
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  获取配置链接
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  复制上方的配置链接，支持 JSON 和 Base64 两种格式。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  导入 TVBox
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  打开 TVBox 应用，进入设置 → 配置地址，粘贴复制的链接并确认导入。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 font-bold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  开始使用
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  配置导入成功后，即可在 TVBox 中浏览和观看 LunaTV 的视频内容。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 支持功能 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            ✨ 支持功能
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                视频功能
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-6">
                <li>• 自动同步 LunaTV 的所有视频源</li>
                <li>• 支持搜索和快速搜索</li>
                <li>• 支持分类筛选</li>
                <li>• 内置视频解析接口</li>
                <li>• 广告过滤规则</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                兼容性
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-6">
                <li>• 完全兼容 TVBox 及衍生应用</li>
                <li>• 支持 Android TV、手机、平板</li>
                <li>• 配置实时更新</li>
                <li>• CORS 跨域支持</li>
                <li>• 配置即时生效</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 技术细节 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            🛠️ 技术细节
          </h2>

          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">API 端点</h4>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 font-mono text-xs">
                GET /api/tvbox?format=json<br />
                GET /api/tvbox?format=base64
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">更新机制</h4>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 配置变更即时生效</li>
                <li>• 无缓存延迟</li>
                <li>• 支持手动刷新</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 注意事项 */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ 注意事项
          </h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• 确保 TVBox 设备能够访问您的 LunaTV 服务器</li>
            <li>• 建议使用 HTTPS 协议确保安全性</li>
            <li>• 配置修改后即时生效，无需等待缓存刷新</li>
            <li>• 解析效果取决于原始视频源的可用性</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}