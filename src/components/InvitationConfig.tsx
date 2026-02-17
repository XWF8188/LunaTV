/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Users, Gift, RefreshCw, Save, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InvitationConfig {
  enabled: boolean;
  rewardPoints: number;
  redeemThreshold: number;
  cardKeyType: 'year' | 'quarter' | 'month' | 'week';
  updatedAt?: number;
}

export default function InvitationConfigManager() {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/invitation-config');
      if (!res.ok) {
        throw new Error('获取邀请配置失败');
      }
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('获取邀请配置失败:', err);
      alert('获取邀请配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setSuccess(false);

      const res = await fetch('/api/admin/invitation-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardPoints: config.rewardPoints,
          redeemThreshold: config.redeemThreshold,
          cardKeyType: config.cardKeyType,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '保存失败');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      await fetchConfig();
    } catch (err) {
      console.error('保存邀请配置失败:', err);
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const cardKeyTypeOptions = [
    { value: 'year', label: '年卡' },
    { value: 'quarter', label: '季卡' },
    { value: 'month', label: '月卡' },
    { value: 'week', label: '周卡' },
  ];

  if (loading) {
    return (
      <div className='flex justify-center items-center py-8'>
        <div className='flex items-center gap-3'>
          <RefreshCw className='w-5 h-5 animate-spin text-blue-600' />
          <span className='text-sm text-gray-600 dark:text-gray-400'>
            加载中...
          </span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className='text-center py-8 text-gray-600 dark:text-gray-400'>
        加载失败，请刷新页面重试
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 配置说明 */}
      <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
        <h3 className='font-medium text-gray-900 dark:text-gray-100 mb-2'>
          邀请奖励配置说明
        </h3>
        <ul className='text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside'>
          <li>
            <strong>邀请奖励积分：</strong>
            当有新用户通过某用户的邀请码注册时，该用户将获得的积分奖励
          </li>
          <li>
            <strong>兑换门槛：</strong>
            用户兑换卡密所需的最低积分数量
          </li>
          <li>
            <strong>兑换卡密类型：</strong>
            用户兑换成功后将获得的卡密类型
          </li>
        </ul>
      </div>

      {/* 邀请奖励设置 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <Users className='w-6 h-6 text-blue-600 dark:text-blue-400' />
            <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
              邀请奖励设置
            </h3>
          </div>
        </div>

        <div className='space-y-4'>
          {/* 奖励积分 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              邀请一个好友赠送积分
            </label>
            <input
              type='number'
              min='1'
              value={config.rewardPoints}
              onChange={(e) =>
                setConfig({
                  ...config,
                  rewardPoints: parseInt(e.target.value) || 0,
                })
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              当有新用户通过邀请码注册时，邀请人将获得的积分奖励
            </p>
          </div>

          {/* 兑换门槛 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              兑换卡密所需积分
            </label>
            <input
              type='number'
              min='1'
              value={config.redeemThreshold}
              onChange={(e) =>
                setConfig({
                  ...config,
                  redeemThreshold: parseInt(e.target.value) || 0,
                })
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              用户需要达到此积分数量才能兑换卡密
            </p>
          </div>

          {/* 卡密类型 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              兑换卡密类型
            </label>
            <select
              value={config.cardKeyType}
              onChange={(e) =>
                setConfig({
                  ...config,
                  cardKeyType: e.target.value as
                    | 'year'
                    | 'quarter'
                    | 'month'
                    | 'week',
                })
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            >
              {cardKeyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              用户兑换成功后将获得的卡密类型
            </p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className='flex justify-end gap-3'>
        <button
          type='button'
          onClick={fetchConfig}
          disabled={loading}
          className='inline-flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors'
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          重置
        </button>
        <button
          type='button'
          onClick={handleSave}
          disabled={saving}
          className='inline-flex items-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50'
        >
          {saving ? (
            <>
              <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
              保存中...
            </>
          ) : success ? (
            <>
              <CheckCircle className='w-4 h-4 mr-2' />
              已保存
            </>
          ) : (
            <>
              <Save className='w-4 h-4 mr-2' />
              保存配置
            </>
          )}
        </button>
      </div>

      {/* 配置更新时间 */}
      {config.updatedAt && (
        <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
          最后更新时间：{new Date(config.updatedAt).toLocaleString('zh-CN')}
        </p>
      )}
    </div>
  );
}
