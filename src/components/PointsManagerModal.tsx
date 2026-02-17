/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

'use client';

import {
  ChevronDown,
  ChevronUp,
  Gift,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface PointsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onSuccess: () => void;
}

interface PointsInfo {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
}

interface PointsRecord {
  id: string;
  username: string;
  type: 'earn' | 'redeem' | 'admin_adjust';
  amount: number;
  reason: string;
  relatedUser?: string;
  adminUsername?: string;
  createdAt: number;
}

const POINTS_TYPE_LABELS: Record<string, string> = {
  earn: '获取',
  redeem: '消费',
  admin_adjust: '管理调整',
};

export default function PointsManagerModal({
  isOpen,
  onClose,
  username,
  onSuccess,
}: PointsManagerModalProps) {
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null);
  const [history, setHistory] = useState<PointsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchPointsInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/points/users`);
      if (!res.ok) throw new Error('获取积分信息失败');
      const data = await res.json();
      const userInfo = data.users?.find(
        (u: { username: string }) => u.username === username,
      );
      if (userInfo) {
        setPointsInfo({
          balance: userInfo.balance,
          totalEarned: userInfo.totalEarned,
          totalRedeemed: userInfo.totalRedeemed,
        });
      } else {
        setPointsInfo({ balance: 0, totalEarned: 0, totalRedeemed: 0 });
      }
    } catch (err) {
      console.error('获取积分信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (pageNum: number = 1) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(
        `/api/admin/points/history?username=${encodeURIComponent(username)}&page=${pageNum}&pageSize=20`,
      );
      if (!res.ok) throw new Error('获取积分历史失败');
      const data = await res.json();
      if (pageNum === 1) {
        setHistory(data.history || []);
      } else {
        setHistory((prev) => [...prev, ...(data.history || [])]);
      }
      setHasMore((data.history || []).length === 20);
      setPage(pageNum);
    } catch (err) {
      console.error('获取积分历史失败:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdjust = async () => {
    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效的积分数量');
      return;
    }
    if (!adjustReason.trim()) {
      alert('请输入调整原因');
      return;
    }
    if (adjustReason.length > 200) {
      alert('调整原因不能超过200字符');
      return;
    }
    if (adjustType === 'deduct' && pointsInfo && amount > pointsInfo.balance) {
      alert('扣除积分不能超过用户当前余额');
      return;
    }

    try {
      setAdjusting(true);
      const res = await fetch('/api/admin/points/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          type: adjustType,
          amount,
          reason: adjustReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '调整积分失败');
      }

      setShowAdjustForm(false);
      setAdjustAmount('');
      setAdjustReason('');
      await fetchPointsInfo();
      await fetchHistory(1);
      onSuccess();
      alert(adjustType === 'add' ? '积分增加成功' : '积分扣除成功');
    } catch (err) {
      alert(err instanceof Error ? err.message : '调整积分失败');
    } finally {
      setAdjusting(false);
    }
  };

  useEffect(() => {
    if (isOpen && username) {
      fetchPointsInfo();
      fetchHistory(1);
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <Gift className='w-6 h-6 text-blue-600 dark:text-blue-400' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                用户积分管理 - {username}
              </h3>
            </div>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
            >
              <X className='w-6 h-6' />
            </button>
          </div>
        </div>

        <div className='p-6 space-y-6'>
          {loading ? (
            <div className='flex justify-center items-center py-8'>
              <RefreshCw className='w-6 h-6 animate-spin text-blue-600' />
            </div>
          ) : (
            <>
              <div className='grid grid-cols-3 gap-4'>
                <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                    {pointsInfo?.balance || 0}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    当前余额
                  </div>
                </div>
                <div className='bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                    {pointsInfo?.totalEarned || 0}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    累计获取
                  </div>
                </div>
                <div className='bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-orange-600 dark:text-orange-400'>
                    {pointsInfo?.totalRedeemed || 0}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    累计消费
                  </div>
                </div>
              </div>

              <div>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                    积分历史
                  </h4>
                  <button
                    onClick={() => fetchHistory(1)}
                    disabled={historyLoading}
                    className='text-xs text-blue-600 dark:text-blue-400 hover:underline'
                  >
                    刷新
                  </button>
                </div>
                <div className='border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto'>
                  {history.length === 0 ? (
                    <div className='p-4 text-center text-gray-500 dark:text-gray-400 text-sm'>
                      暂无积分记录
                    </div>
                  ) : (
                    history.map((record) => (
                      <div
                        key={record.id}
                        className='p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      >
                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                record.type === 'earn'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : record.type === 'redeem'
                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              }`}
                            >
                              {POINTS_TYPE_LABELS[record.type]}
                            </span>
                            <span className='text-sm text-gray-900 dark:text-gray-100'>
                              {record.reason}
                            </span>
                            {record.adminUsername && (
                              <span className='text-xs text-gray-500 dark:text-gray-400'>
                                (由 {record.adminUsername} 操作)
                              </span>
                            )}
                          </div>
                          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                            {new Date(record.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            record.amount > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {record.amount > 0 ? '+' : ''}
                          {record.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {hasMore && (
                  <div className='mt-2 text-center'>
                    <button
                      onClick={() => fetchHistory(page + 1)}
                      disabled={historyLoading}
                      className='text-sm text-blue-600 dark:text-blue-400 hover:underline'
                    >
                      {historyLoading ? '加载中...' : '加载更多'}
                    </button>
                  </div>
                )}
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
                <div className='flex items-center gap-3 mb-4'>
                  <button
                    onClick={() => {
                      setShowAdjustForm(true);
                      setAdjustType('add');
                    }}
                    disabled={showAdjustForm}
                    className='flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50'
                  >
                    <PlusCircle className='w-4 h-4' />
                    增加积分
                  </button>
                  <button
                    onClick={() => {
                      setShowAdjustForm(true);
                      setAdjustType('deduct');
                    }}
                    disabled={showAdjustForm}
                    className='flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50'
                  >
                    <MinusCircle className='w-4 h-4' />
                    扣除积分
                  </button>
                </div>

                {showAdjustForm && (
                  <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4'>
                    <div className='flex items-center justify-between'>
                      <h5 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {adjustType === 'add' ? '增加积分' : '扣除积分'}
                      </h5>
                      <button
                        onClick={() => {
                          setShowAdjustForm(false);
                          setAdjustAmount('');
                          setAdjustReason('');
                        }}
                        className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      >
                        <X className='w-5 h-5' />
                      </button>
                    </div>

                    <div>
                      <label className='block text-sm text-gray-700 dark:text-gray-300 mb-1'>
                        积分数量
                      </label>
                      <input
                        type='number'
                        min='1'
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder='请输入正整数'
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                      {adjustType === 'deduct' && pointsInfo && (
                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                          当前可扣除最大值: {pointsInfo.balance}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-sm text-gray-700 dark:text-gray-300 mb-1'>
                        调整原因
                      </label>
                      <textarea
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder='请输入调整原因（不超过200字符）'
                        rows={2}
                        maxLength={200}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
                      />
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1 text-right'>
                        {adjustReason.length}/200
                      </p>
                    </div>

                    <div className='flex justify-end gap-3'>
                      <button
                        onClick={() => {
                          setShowAdjustForm(false);
                          setAdjustAmount('');
                          setAdjustReason('');
                        }}
                        className='px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors'
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAdjust}
                        disabled={adjusting}
                        className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                          adjustType === 'add'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {adjusting
                          ? '处理中...'
                          : adjustType === 'add'
                            ? '确认增加'
                            : '确认扣除'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
