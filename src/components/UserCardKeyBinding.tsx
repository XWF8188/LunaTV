/* eslint-disable @typescript-eslint/no-explicit-any, no-console, react-hooks/exhaustive-deps */

'use client';

import { AlertCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { UserCardKeyInfo } from '@/lib/types';

export default function UserCardKeyBinding() {
  const [cardKeyInfo, setCardKeyInfo] = useState<UserCardKeyInfo | null>(null);
  const [hasCardKey, setHasCardKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCardKey, setNewCardKey] = useState('');
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState('');

  // 获取用户卡密状态
  const fetchCardKeyStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/cardkey');
      if (!res.ok) {
        throw new Error(`获取卡密状态失败: ${res.status}`);
      }
      const data = await res.json();
      setHasCardKey(data.hasCardKey);
      setCardKeyInfo(data.cardKeyInfo || null);
    } catch (err) {
      console.error('获取卡密状态失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 绑定新卡密
  const handleBindCardKey = async () => {
    if (!newCardKey.trim()) {
      setError('请输入卡密');
      return;
    }

    setBinding(true);
    setError('');
    try {
      const res = await fetch('/api/user/cardkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardKey: newCardKey.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `绑定卡密失败: ${res.status}`);
      }

      const data = await res.json();
      setCardKeyInfo(data.cardKeyInfo);
      setHasCardKey(true);
      setNewCardKey('');
      alert('卡密绑定成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定卡密失败');
    } finally {
      setBinding(false);
    }
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  useEffect(() => {
    fetchCardKeyStatus();
  }, [fetchCardKeyStatus]);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold'>卡密管理</h2>
        <button
          type='button'
          onClick={fetchCardKeyStatus}
          disabled={loading}
          className='inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50'
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          刷新
        </button>
      </div>

      {/* 卡密状态 */}
      {loading ? (
        <div className='p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center'>
          加载中...
        </div>
      ) : !hasCardKey ? (
        <div className='p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
          <div className='flex items-center mb-4'>
            <AlertCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3' />
            <h3 className='text-lg font-semibold text-yellow-800 dark:text-yellow-200'>
              未绑定卡密
            </h3>
          </div>
          <p className='text-yellow-700 dark:text-yellow-300 mb-4'>
            您需要绑定卡密才能使用系统功能。请联系管理员获取卡密。
          </p>
          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2'>
                卡密
              </label>
              <input
                type='text'
                value={newCardKey}
                onChange={(e) => setNewCardKey(e.target.value)}
                placeholder='请输入卡密'
                className='w-full px-4 py-2 border border-yellow-300 dark:border-yellow-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-yellow-900/30 dark:text-white'
              />
            </div>
            {error && (
              <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            )}
            <button
              type='button'
              onClick={handleBindCardKey}
              disabled={binding || !newCardKey.trim()}
              className='w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50'
            >
              {binding ? '绑定中...' : '绑定卡密'}
            </button>
          </div>
        </div>
      ) : (
        <div className='space-y-4'>
          {/* 卡密过期警告 */}
          {cardKeyInfo?.isExpiring && (
            <div
              className={`p-4 rounded-lg border ${
                cardKeyInfo.isExpired
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <div className='flex items-center'>
                {cardKeyInfo.isExpired ? (
                  <XCircle className='w-6 h-6 text-red-600 dark:text-red-400 mr-3' />
                ) : (
                  <AlertCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3' />
                )}
                <div>
                  {cardKeyInfo.isExpired ? (
                    <h3 className='text-lg font-semibold text-red-800 dark:text-red-200'>
                      卡密已过期
                    </h3>
                  ) : (
                    <h3 className='text-lg font-semibold text-yellow-800 dark:text-yellow-200'>
                      卡密即将过期
                    </h3>
                  )}
                  <p
                    className={`text-sm mt-1 ${
                      cardKeyInfo.isExpired
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-yellow-700 dark:text-yellow-300'
                    }`}
                  >
                    {cardKeyInfo.isExpired
                      ? '您的卡密已过期，请立即绑定新卡密以继续使用系统。'
                      : `您的卡密将在 ${cardKeyInfo.daysRemaining} 天后过期，请及时续费。`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 卡密信息 */}
          <div className='p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
            <div className='flex items-center mb-4'>
              <CheckCircle className='w-6 h-6 text-green-600 dark:text-green-400 mr-3' />
              <h3 className='text-lg font-semibold text-green-800 dark:text-green-200'>
                已绑定卡密
              </h3>
            </div>
            <div className='space-y-3'>
              <div className='flex justify-between items-center py-2 border-b border-green-200 dark:border-green-800'>
                <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                  过期时间
                </span>
                <span className='text-sm text-green-800 dark:text-green-200 font-mono'>
                  {cardKeyInfo ? formatDate(cardKeyInfo.expiresAt) : '-'}
                </span>
              </div>
              <div className='flex justify-between items-center py-2 border-b border-green-200 dark:border-green-800'>
                <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                  剩余天数
                </span>
                <span className='text-sm text-green-800 dark:text-green-200 font-mono'>
                  {cardKeyInfo?.daysRemaining} 天
                </span>
              </div>
              <div className='flex justify-between items-center py-2'>
                <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                  状态
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    cardKeyInfo?.isExpired
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                      : cardKeyInfo?.isExpiring
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                  }`}
                >
                  {cardKeyInfo?.isExpired
                    ? '已过期'
                    : cardKeyInfo?.isExpiring
                      ? '即将过期'
                      : '正常'}
                </span>
              </div>
            </div>
          </div>

          {/* 重新绑定 */}
          <div className='p-6 bg-gray-100 dark:bg-gray-800 rounded-lg'>
            <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4'>
              重新绑定卡密
            </h3>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              绑定新卡密可以延长您的账户有效期。新卡密的过期时间必须晚于当前卡密。
            </p>
            <div className='space-y-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  新卡密
                </label>
                <input
                  type='text'
                  value={newCardKey}
                  onChange={(e) => setNewCardKey(e.target.value)}
                  placeholder='请输入新卡密'
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white'
                />
              </div>
              {error && (
                <p className='text-sm text-red-600 dark:text-red-400'>
                  {error}
                </p>
              )}
              <button
                type='button'
                onClick={handleBindCardKey}
                disabled={binding || !newCardKey.trim()}
                className='w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50'
              >
                {binding ? '绑定中...' : '绑定新卡密'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
