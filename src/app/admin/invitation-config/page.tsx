'use client';

import { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';

interface InvitationConfig {
  rewardPoints: number;
  redeemThreshold: number;
  cardKeyType: 'year' | 'quarter' | 'month' | 'week';
  updatedAt: number;
}

export default function InvitationConfigPage() {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/invitation-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      showMessage('error', '获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/invitation-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        showMessage('success', '配置保存成功');
        fetchConfig();
      } else {
        const error = await response.json();
        showMessage('error', error.error || '保存失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      showMessage('error', '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto'></div>
          <p className='mt-4 text-gray-600'>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8 px-4'>
      <div className='max-w-2xl mx-auto'>
        <h1 className='text-3xl font-bold text-center mb-8 flex items-center justify-center'>
          <Settings className='mr-3 h-8 w-8' />
          邀请配置管理
        </h1>

        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <p
              className={`font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {config && (
          <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
            <h2 className='text-xl font-semibold mb-6'>邀请奖励配置</h2>

            <div className='space-y-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  邀请奖励积分
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
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <p className='mt-1 text-sm text-gray-500'>
                  当用户邀请好友注册成功后，邀请人获得的积分数量
                </p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  兑换一周卡密所需积分
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
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <p className='mt-1 text-sm text-gray-500'>
                  用户使用积分兑换一周卡密时需要消耗的积分数量
                </p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
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
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value='week'>周卡（7天）</option>
                  <option value='month'>月卡（30天）</option>
                  <option value='quarter'>季卡（90天）</option>
                  <option value='year'>年卡（365天）</option>
                </select>
                <p className='mt-1 text-sm text-gray-500'>用户兑换的卡密类型</p>
              </div>
            </div>

            <div className='mt-8 pt-6 border-t'>
              <div className='flex items-center justify-between mb-4'>
                <span className='text-sm text-gray-500'>
                  最后更新: {formatDate(config.updatedAt)}
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className='flex items-center px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
                >
                  <Save className='mr-2 h-5 w-5' />
                  {saving ? '保存中...' : '保存配置'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className='bg-blue-50 rounded-lg p-6'>
          <h3 className='font-semibold mb-3'>配置说明</h3>
          <ul className='space-y-2 text-sm text-gray-700'>
            <li>1. 邀请奖励积分：好友注册成功后邀请人获得的积分</li>
            <li>2. 兑换阈值：用户兑换卡密时需要消耗的积分</li>
            <li>3. 卡密类型：用户通过积分兑换的卡密类型</li>
            <li>4. 修改配置后,新的配置会立即生效</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
