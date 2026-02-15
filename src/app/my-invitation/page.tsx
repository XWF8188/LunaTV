/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Users, Gift, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InvitationInfo {
  code: string;
  totalInvites: number;
  totalRewards: number;
  balance: number;
}

export default function MyInvitationPage() {
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchInvitationInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/invitation/info');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `获取邀请信息失败: ${res.status}`);
      }
      const data = await res.json();
      setInfo(data);
    } catch (err) {
      console.error('获取邀请信息失败:', err);
      setError(err instanceof Error ? err.message : '获取邀请信息失败');
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = () => {
    if (!info) return;

    const link = `${window.location.origin}/register?invitationCode=${info.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    fetchInvitationInfo();
  }, []);

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
      <div className='max-w-3xl mx-auto'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4'>
            我的邀请
          </h1>
          <p className='text-lg text-gray-600 dark:text-gray-400'>
            邀请好友注册，双方均可获得积分奖励
          </p>
        </div>

        {error && (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
          </div>
        )}

        {info && (
          <>
            <div className='space-y-6'>
              {/* 邀请码卡片 */}
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    邀请码
                  </h2>
                  <button
                    type='button'
                    onClick={fetchInvitationInfo}
                    disabled={loading}
                    className='inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                    />
                    刷新
                  </button>
                </div>

                <div className='flex items-center gap-4'>
                  <div className='flex-1 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                    <code className='text-2xl font-mono text-gray-900 dark:text-gray-100 break-all'>
                      {info.code}
                    </code>
                  </div>
                  <button
                    type='button'
                    onClick={copyInvitationLink}
                    className='inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50'
                  >
                    {copied ? (
                      <>
                        <CheckCircle className='w-5 h-5 mr-2' />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className='w-5 h-5 mr-2' />
                        复制链接
                      </>
                    )}
                  </button>
                </div>

                <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>
                  分享此链接给好友，好友注册后您将获得积分奖励
                </p>
              </div>

              {/* 统计卡片 */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <Users className='w-8 h-8 text-blue-600 dark:text-blue-400' />
                    <span className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                      {info.totalInvites}
                    </span>
                  </div>
                  <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                    邀请人数
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    成功邀请的好友数量
                  </p>
                </div>

                <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <Gift className='w-8 h-8 text-green-600 dark:text-green-400' />
                    <span className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                      {info.totalRewards}
                    </span>
                  </div>
                  <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                    累计奖励
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    累计获得的积分奖励
                  </p>
                </div>

                <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <Gift className='w-8 h-8 text-purple-600 dark:text-purple-400' />
                    <span className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                      {info.balance}
                    </span>
                  </div>
                  <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                    当前积分
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    可用于兑换卡密
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
