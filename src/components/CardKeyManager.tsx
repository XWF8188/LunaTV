/* eslint-disable @typescript-eslint/no-explicit-any, no-console, react-hooks/exhaustive-deps */

'use client';

import {
  CheckCircle,
  Download,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { CardKey } from '@/lib/types';

// 卡密类型映射
const CARD_KEY_TYPE_LABELS: Record<string, string> = {
  year: '1年',
  quarter: '1季（90天）',
  month: '1月（30天）',
  week: '1周（7天）',
};

// 卡密状态映射
const CARD_KEY_STATUS_LABELS: Record<string, string> = {
  unused: '未使用',
  used: '已使用',
  expired: '已过期',
};

interface CardKeyManagerProps {
  onClose?: () => void;
}

export default function CardKeyManager({ onClose }: CardKeyManagerProps) {
  const [cardKeys, setCardKeys] = useState<CardKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newKeyType, setNewKeyType] = useState<
    'year' | 'quarter' | 'month' | 'week'
  >('week');
  const [newKeyCount, setNewKeyCount] = useState(1);
  const [createdKeys, setCreatedKeys] = useState<string[]>([]);
  const [showCreatedKeys, setShowCreatedKeys] = useState(false);

  // 获取卡密列表
  const fetchCardKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cardkey');
      if (!res.ok) {
        throw new Error(`获取卡密列表失败: ${res.status}`);
      }
      const data = await res.json();
      setCardKeys(data.cardKeys || []);
    } catch (err) {
      console.error('获取卡密列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建卡密
  const handleCreateCardKeys = async () => {
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/cardkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          type: newKeyType,
          count: newKeyCount,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `创建卡密失败: ${res.status}`);
      }

      const data = await res.json();
      setCreatedKeys(data.result.keys || []);
      setShowCreatedKeys(true);
      setShowCreateModal(false);
      await fetchCardKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建卡密失败');
    } finally {
      setCreateLoading(false);
    }
  };

  // 清理过期卡密
  const handleCleanupExpired = async () => {
    if (!confirm('确定要清理所有过期的未使用卡密吗？')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/cardkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup',
        }),
      });

      if (!res.ok) {
        throw new Error(`清理失败: ${res.status}`);
      }

      const data = await res.json();
      alert(`已清理 ${data.cleanedCount} 个过期卡密`);
      await fetchCardKeys();
    } catch (err) {
      console.error('清理过期卡密失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 删除卡密
  const handleDeleteCardKey = async (keyHash: string) => {
    if (!confirm('确定要删除此卡密吗？')) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/cardkey?hash=${encodeURIComponent(keyHash)}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `删除失败: ${res.status}`);
      }

      await fetchCardKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除卡密失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出卡密
  const handleExportCardKeys = async () => {
    try {
      const res = await fetch('/api/admin/cardkey/export');
      if (!res.ok) {
        throw new Error(`导出失败: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cardkeys-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出卡密失败:', err);
      alert('导出卡密失败');
    }
  };

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 复制卡密
  const copyCardKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert('卡密已复制到剪贴板');
  };

  useEffect(() => {
    fetchCardKeys();
  }, [fetchCardKeys]);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold'>卡密管理</h2>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => setShowCreateModal(true)}
            className='inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
          >
            <Plus className='w-4 h-4 mr-2' />
            创建卡密
          </button>
          <button
            type='button'
            onClick={handleExportCardKeys}
            className='inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors'
          >
            <Download className='w-4 h-4 mr-2' />
            导出
          </button>
          <button
            type='button'
            onClick={handleCleanupExpired}
            disabled={loading}
            className='inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            清理过期
          </button>
          <button
            type='button'
            onClick={fetchCardKeys}
            disabled={loading}
            className='inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            刷新
          </button>
          {onClose && (
            <button
              type='button'
              onClick={onClose}
              className='inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors'
            >
              <X className='w-4 h-4 mr-2' />
              关闭
            </button>
          )}
        </div>
      </div>

      {/* 卡密列表 */}
      <div className='bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden'>
        <table className='w-full'>
          <thead>
            <tr className='bg-gray-200 dark:bg-gray-700'>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200'>
                卡密哈希
              </th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200'>
                类型
              </th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200'>
                状态
              </th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200'>
                创建时间
              </th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200'>
                过期时间
              </th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200'>
                绑定用户
              </th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200'>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && cardKeys.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className='px-4 py-8 text-center text-gray-500 dark:text-gray-400'
                >
                  加载中...
                </td>
              </tr>
            ) : cardKeys.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className='px-4 py-8 text-center text-gray-500 dark:text-gray-400'
                >
                  暂无卡密
                </td>
              </tr>
            ) : (
              cardKeys.map((cardKey) => (
                <tr
                  key={cardKey.key}
                  className='border-b border-gray-200 dark:border-gray-700'
                >
                  <td className='px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300'>
                    {cardKey.key.substring(0, 20)}...
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                    {CARD_KEY_TYPE_LABELS[cardKey.keyType] || cardKey.keyType}
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    {cardKey.status === 'used' ? (
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'>
                        <CheckCircle className='w-3 h-3 mr-1' />
                        {CARD_KEY_STATUS_LABELS[cardKey.status]}
                      </span>
                    ) : cardKey.status === 'expired' ? (
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'>
                        <X className='w-3 h-3 mr-1' />
                        {CARD_KEY_STATUS_LABELS[cardKey.status]}
                      </span>
                    ) : (
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'>
                        {CARD_KEY_STATUS_LABELS[cardKey.status]}
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                    {formatDate(cardKey.createdAt)}
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                    {formatDate(cardKey.expiresAt)}
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                    {cardKey.boundTo || '-'}
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    {cardKey.status === 'unused' && (
                      <button
                        type='button'
                        onClick={() => handleDeleteCardKey(cardKey.key)}
                        className='inline-flex items-center px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 创建卡密弹窗 */}
      {showCreateModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full'>
            <h3 className='text-lg font-bold mb-4'>创建卡密</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  卡密类型
                </label>
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value as any)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white'
                >
                  <option value='year'>1年（365天）</option>
                  <option value='quarter'>1季（90天）</option>
                  <option value='month'>1月（30天）</option>
                  <option value='week'>1周（7天）</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  生成数量
                </label>
                <input
                  type='number'
                  min='1'
                  max='100'
                  value={newKeyCount}
                  onChange={(e) =>
                    setNewKeyCount(
                      Math.max(1, Math.min(100, parseInt(e.target.value) || 1)),
                    )
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white'
                />
              </div>
              <div className='flex justify-end gap-2 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowCreateModal(false)}
                  className='px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors'
                >
                  取消
                </button>
                <button
                  type='button'
                  onClick={handleCreateCardKeys}
                  disabled={createLoading}
                  className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50'
                >
                  {createLoading ? '创建中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 已创建卡密显示弹窗 */}
      {showCreatedKeys && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-bold'>
                已创建 {createdKeys.length} 个卡密
              </h3>
              <button
                type='button'
                onClick={() => setShowCreatedKeys(false)}
                className='inline-flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
              请保存这些卡密，关闭后将无法再次查看
            </p>
            <div className='space-y-2'>
              {createdKeys.map((key, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
                >
                  <span className='font-mono text-sm'>{key}</span>
                  <button
                    type='button'
                    onClick={() => copyCardKey(key)}
                    className='px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors'
                  >
                    复制
                  </button>
                </div>
              ))}
            </div>
            <div className='flex justify-end mt-4'>
              <button
                type='button'
                onClick={() => setShowCreatedKeys(false)}
                className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
