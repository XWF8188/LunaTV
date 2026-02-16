/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  Gift,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Home,
  Copy,
  Key,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface PointsHistory {
  id: string;
  type: 'earn' | 'redeem' | 'admin_adjust';
  amount: number;
  reason: string;
  relatedUser?: string;
  cardKeyId?: string;
  createdAt: number;
}

interface InvitationConfig {
  enabled: boolean;
  rewardPoints: number;
  redeemThreshold: number;
  cardKeyType: 'year' | 'quarter' | 'month' | 'week';
}

interface UserCardKey {
  id: string;
  keyHash: string;
  type: 'year' | 'quarter' | 'month' | 'week';
  status: 'unused' | 'used' | 'expired';
  createdAt: number;
  expiresAt: number;
  plainKey?: string;
}

const CARD_KEY_TYPE_LABELS: Record<string, string> = {
  year: '年卡',
  quarter: '季卡',
  month: '月卡',
  week: '周卡',
};

export default function PointsExchangePage() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [userCardKeys, setUserCardKeys] = useState<UserCardKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [balanceRes, historyRes, configRes, cardKeysRes] =
        await Promise.all([
          fetch('/api/points/balance'),
          fetch('/api/points/history'),
          fetch('/api/admin/invitation-config'),
          fetch('/api/cardkeys/my'),
        ]);

      if (!balanceRes.ok) {
        const errorData = await balanceRes.json();
        throw new Error(
          errorData.error || `获取积分余额失败: ${balanceRes.status}`,
        );
      }

      if (!historyRes.ok) {
        const errorData = await historyRes.json();
        throw new Error(
          errorData.error || `获取积分历史失败: ${historyRes.status}`,
        );
      }

      const balanceData = await balanceRes.json();
      const historyData = await historyRes.json();
      const configData = await configRes.json();
      const cardKeysData = await cardKeysRes.json();

      setBalance(balanceData.balance);
      setHistory(historyData.history || []);
      setConfig(configData);
      setUserCardKeys(cardKeysData.cardKeys || []);
    } catch (err) {
      console.error('获取数据失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCardKey = async () => {
    try {
      setRedeeming(true);
      setError('');
      setSuccess('');

      const res = await fetch('/api/redeem/cardkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '兑换失败');
      }

      setSuccess(`兑换成功！卡密：${data.cardKey}`);
      await fetchData();
    } catch (err) {
      console.error('兑换失败:', err);
      setError(err instanceof Error ? err.message : '兑换失败');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyCardKey = async (cardKey: UserCardKey) => {
    if (cardKey.plainKey) {
      await navigator.clipboard.writeText(cardKey.plainKey);
      setCopiedId(cardKey.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const formatExpiryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const unusedCardKeys = userCardKeys.filter((ck) => ck.status === 'unused');
  const redeemThreshold = config?.redeemThreshold || 300;
  const cardKeyTypeName = config?.cardKeyType
    ? CARD_KEY_TYPE_LABELS[config.cardKeyType]
    : '周卡';

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <RefreshCw className='w-8 h-8 animate-spin mx-auto text-gray-400' />
          <p className='mt-4 text-gray-600 dark:text-gray-400'>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex items-center justify-between mb-12'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4'>
              积分兑换
            </h1>
            <p className='text-lg text-gray-600 dark:text-gray-400'>
              使用积分兑换卡密，延长账户有效期
            </p>
          </div>
          <button
            type='button'
            onClick={() => (window.location.href = '/')}
            className='inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors'
          >
            <Home className='w-5 h-5 mr-2' />
            返回首页
          </button>
        </div>

        {error && (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 mt-0.5' />
            <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
          </div>
        )}

        {success && (
          <div className='mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3'>
            <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400 mt-0.5' />
            <p className='text-sm text-green-800 dark:text-green-200'>
              {success}
            </p>
          </div>
        )}

        <div className='space-y-6'>
          {/* 未使用卡密卡片 */}
          {unusedCardKeys.length > 0 && (
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6'>
              <div className='flex items-center gap-3 mb-6'>
                <Key className='w-6 h-6 text-amber-600 dark:text-amber-400' />
                <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                  未使用卡密
                </h2>
              </div>
              <div className='space-y-3'>
                {unusedCardKeys.map((cardKey) => (
                  <div
                    key={cardKey.id}
                    className='flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800'
                  >
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {CARD_KEY_TYPE_LABELS[cardKey.type] || cardKey.type}
                        </span>
                        <span className='text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full'>
                          未使用
                        </span>
                      </div>
                      {cardKey.plainKey && (
                        <p className='text-lg font-mono text-amber-700 dark:text-amber-300'>
                          {cardKey.plainKey}
                        </p>
                      )}
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        过期时间：{formatExpiryDate(cardKey.expiresAt)}
                      </p>
                    </div>
                    {cardKey.plainKey && (
                      <button
                        type='button'
                        onClick={() => handleCopyCardKey(cardKey)}
                        className='ml-4 inline-flex items-center px-3 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors'
                      >
                        {copiedId === cardKey.id ? (
                          <>
                            <CheckCircle className='w-4 h-4 mr-1' />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className='w-4 h-4 mr-1' />
                            复制
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 积分余额卡片 */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                积分余额
              </h2>
              <button
                type='button'
                onClick={fetchData}
                disabled={loading}
                className='inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                刷新
              </button>
            </div>

            <div className='flex items-center justify-center py-8'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-4'>
                  <Gift className='w-12 h-12 text-purple-600 dark:text-purple-400' />
                </div>
                <p className='text-6xl font-bold text-purple-600 dark:text-purple-400 mb-2'>
                  {balance}
                </p>
                <p className='text-lg text-gray-600 dark:text-gray-400'>积分</p>
              </div>
            </div>

            <button
              type='button'
              onClick={handleRedeemCardKey}
              disabled={redeeming || balance < redeemThreshold}
              className='w-full inline-flex items-center justify-center px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50'
            >
              {redeeming ? (
                <>
                  <RefreshCw className='w-5 h-5 mr-2 animate-spin' />
                  兑换中...
                </>
              ) : (
                <>
                  <Gift className='w-5 h-5 mr-2' />
                  兑换{cardKeyTypeName}（需要{redeemThreshold}积分）
                </>
              )}
            </button>

            {balance < redeemThreshold && (
              <p className='mt-4 text-center text-sm text-red-600 dark:text-red-400'>
                积分不足，需要{redeemThreshold}积分才能兑换
              </p>
            )}
          </div>

          {/* 积分明细卡片 */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6'>
              积分明细
            </h2>

            {history.length === 0 ? (
              <div className='text-center py-8'>
                <Clock className='w-12 h-12 mx-auto text-gray-400 mb-4' />
                <p className='text-gray-600 dark:text-gray-400'>暂无积分记录</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {history.map((record) => (
                  <div
                    key={record.id}
                    className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'
                  >
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {record.reason}
                        </span>
                        {record.relatedUser && (
                          <span className='text-xs text-gray-600 dark:text-gray-400'>
                            ({record.relatedUser})
                          </span>
                        )}
                        {record.type === 'admin_adjust' && (
                          <span className='text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full'>
                            管理员调整
                          </span>
                        )}
                      </div>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>
                        {formatDate(record.createdAt)}
                      </p>
                    </div>
                    <div
                      className={`text-lg font-semibold ${
                        record.amount > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {record.amount > 0 ? '+' : ''}
                      {record.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
