/* eslint-disable @typescript-eslint/no-explicit-any, no-console, react-hooks/exhaustive-deps */

'use client';

import {
  CheckCircle,
  Copy,
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
  const copyCardKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      alert('卡密已复制到剪贴板');
    } catch (err) {
      // 如果 clipboard API 失败，使用备用方法
      const textarea = document.createElement('textarea');
      textarea.value = key;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('卡密已复制到剪贴板');
      } catch (err) {
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  // 复制全部卡密
  const copyAllCardKeys = async () => {
    const allKeys = createdKeys.join('\n');
    try {
      await navigator.clipboard.writeText(allKeys);
      alert(`已复制 ${createdKeys.length} 个卡密到剪贴板`);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = allKeys;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert(`已复制 ${createdKeys.length} 个卡密到剪贴板`);
      } catch (err) {
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  useEffect(() => {
    fetchCardKeys();
  }, [fetchCardKeys]);

  return (
    <div className='space-y-6'>
      {/* 页面标题和操作栏 */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-50/50 via-amber-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-yellow-950/20 backdrop-blur-3xl p-6 rounded-2xl border border-orange-200/30 dark:border-orange-800/30 shadow-xl shadow-orange-500/10'>
        <div className='flex items-center gap-3'>
          <div className='relative'>
            <div className='absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl blur-xl opacity-30 animate-pulse-soft' />
            <div className='relative p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/30'>
              <CheckCircle className='w-6 h-6 text-white' />
            </div>
          </div>
          <div>
            <h2 className='text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 dark:from-orange-400 dark:via-amber-400 dark:to-yellow-400 bg-clip-text text-transparent'>
              卡密管理
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
              创建和管理您的卡密
            </p>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={() => setShowCreateModal(true)}
            className='inline-flex items-center px-5 py-2.5 text-white bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-95'
          >
            <Plus className='w-4 h-4 mr-2' />
            <span className='font-semibold'>创建卡密</span>
          </button>
          <button
            type='button'
            onClick={handleExportCardKeys}
            className='inline-flex items-center px-4 py-2.5 text-white bg-gradient-to-br from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95'
          >
            <Download className='w-4 h-4 mr-2' />
            <span className='font-medium'>导出</span>
          </button>
          <button
            type='button'
            onClick={handleCleanupExpired}
            disabled={loading}
            className='inline-flex items-center px-4 py-2.5 text-white bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            <span className='font-medium'>清理过期</span>
          </button>
          <button
            type='button'
            onClick={fetchCardKeys}
            disabled={loading}
            className='inline-flex items-center px-4 py-2.5 text-white bg-gradient-to-br from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 rounded-xl transition-all duration-300 shadow-lg shadow-gray-500/30 hover:shadow-xl hover:shadow-gray-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            <span className='font-medium'>刷新</span>
          </button>
          {onClose && (
            <button
              type='button'
              onClick={onClose}
              className='inline-flex items-center px-4 py-2.5 text-white bg-gradient-to-br from-gray-400 to-slate-400 hover:from-gray-500 hover:to-slate-500 rounded-xl transition-all duration-300 shadow-lg shadow-gray-400/30 hover:shadow-xl hover:shadow-gray-400/40 hover:-translate-y-0.5 active:scale-95'
            >
              <X className='w-4 h-4 mr-2' />
              <span className='font-medium'>关闭</span>
            </button>
          )}
        </div>
      </div>

      {/* 精美卡密列表表格 */}
      <div className='bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/10 dark:shadow-orange-500/20 border border-orange-200/30 dark:border-orange-800/30'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='bg-gradient-to-r from-orange-50/80 via-amber-50/80 to-yellow-50/80 dark:from-orange-950/40 dark:via-amber-950/40 dark:to-yellow-950/40 border-b-2 border-orange-200/40 dark:border-orange-800/40'>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  卡密
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  类型
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  状态
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  创建时间
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  过期时间
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  绑定用户
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  操作
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-orange-100/30 dark:divide-orange-900/30'>
              {loading && cardKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center'>
                    <div className='flex flex-col items-center justify-center gap-4'>
                      <div className='relative'>
                        <div className='w-16 h-16 border-4 border-orange-200 dark:border-orange-800 rounded-full' />
                        <div className='absolute inset-0 w-16 h-16 border-4 border-t-transparent border-orange-500 rounded-full animate-spin' />
                      </div>
                      <span className='text-gray-600 dark:text-gray-400 font-medium'>
                        加载中...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : cardKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center'>
                    <div className='flex flex-col items-center justify-center gap-4'>
                      <div className='relative'>
                        <div className='absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 rounded-full blur-2xl opacity-20' />
                        <div className='relative p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-full'>
                          <CheckCircle className='w-12 h-12 text-orange-400 dark:text-orange-500' />
                        </div>
                      </div>
                      <span className='text-gray-600 dark:text-gray-400 font-medium text-lg'>
                        暂无卡密
                      </span>
                      <p className='text-sm text-gray-500 dark:text-gray-500'>
                        点击上方"创建卡密"按钮开始创建
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                cardKeys.map((cardKey) => (
                  <tr
                    key={cardKey.keyHash}
                    className='transition-all duration-300 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-amber-50/50 dark:hover:from-orange-950/20 dark:hover:to-amber-950/20'
                  >
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2'>
                        <code className='font-mono text-sm bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 px-3 py-1.5 rounded-lg border border-orange-200/30 dark:border-orange-800/30 text-gray-700 dark:text-gray-300'>
                          {cardKey.key}
                        </code>
                        <button
                          type='button'
                          onClick={() => copyCardKey(cardKey.key)}
                          className='p-2 hover:bg-gradient-to-br hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30 rounded-xl transition-all duration-300 group hover:shadow-md hover:shadow-orange-500/20'
                          title='复制卡密'
                        >
                          <Copy className='w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors' />
                        </button>
                      </div>
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      <span className='inline-flex items-center px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/30 dark:border-amber-800/30'>
                        {CARD_KEY_TYPE_LABELS[cardKey.keyType] ||
                          cardKey.keyType}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      {cardKey.status === 'used' ? (
                        <span className='inline-flex items-center px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/30 dark:border-emerald-800/30 shadow-sm shadow-emerald-500/10'>
                          <CheckCircle className='w-4 h-4 mr-2' />
                          {CARD_KEY_STATUS_LABELS[cardKey.status]}
                        </span>
                      ) : cardKey.status === 'expired' ? (
                        <span className='inline-flex items-center px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 text-red-700 dark:text-red-300 border border-red-200/30 dark:border-red-800/30 shadow-sm shadow-red-500/10'>
                          <X className='w-4 h-4 mr-2' />
                          {CARD_KEY_STATUS_LABELS[cardKey.status]}
                        </span>
                      ) : (
                        <span className='inline-flex items-center px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 text-gray-700 dark:text-gray-300 border border-gray-200/30 dark:border-gray-800/30'>
                          {CARD_KEY_STATUS_LABELS[cardKey.status]}
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium'>
                      {formatDate(cardKey.createdAt)}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium'>
                      {formatDate(cardKey.expiresAt)}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium'>
                      {cardKey.boundTo || (
                        <span className='text-gray-400 dark:text-gray-600'>
                          -
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      {cardKey.status === 'unused' && (
                        <button
                          type='button'
                          onClick={() => handleDeleteCardKey(cardKey.keyHash)}
                          className='group relative inline-flex items-center px-4 py-2 bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 hover:from-red-600 hover:via-rose-600 hover:to-pink-600 text-white rounded-xl transition-all duration-300 shadow-md shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5 active:scale-95 overflow-hidden'
                        >
                          <div className='absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                          <Trash2 className='w-4 h-4 relative z-10' />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 精美创建卡密弹窗 */}
      {showCreateModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='relative bg-white/98 dark:bg-gray-900/98 backdrop-blur-3xl rounded-3xl p-8 max-w-lg w-full max-h-[90vh] shadow-2xl shadow-orange-500/20 border border-orange-200/30 dark:border-orange-800/30 animate-scale-in flex flex-col'>
            {/* 装饰性光晕 */}
            <div className='absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 rounded-full blur-3xl opacity-20 pointer-events-none' />
            <div className='absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 rounded-full blur-3xl opacity-20 pointer-events-none' />

            {/* 标题区域 */}
            <div className='relative mb-8 shrink-0'>
              <div className='flex items-center gap-4 mb-2'>
                <div className='relative'>
                  <div className='absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl blur-xl opacity-30 animate-pulse-soft' />
                  <div className='relative p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/30'>
                    <Plus className='w-6 h-6 text-white' />
                  </div>
                </div>
                <div>
                  <h3 className='text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 dark:from-orange-400 dark:via-amber-400 dark:to-yellow-400 bg-clip-text text-transparent'>
                    创建卡密
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    选择类型和数量创建新的卡密
                  </p>
                </div>
              </div>
            </div>

            <div className='relative space-y-6 flex-1 overflow-y-auto pr-2'>
              {/* 卡密类型选择 */}
              <div>
                <label className='block text-sm font-bold tracking-wide text-gray-700 dark:text-gray-300 mb-3'>
                  <span className='flex items-center gap-2'>卡密类型</span>
                </label>
                <div className='grid grid-cols-2 gap-3'>
                  {[
                    { value: 'year', label: '1年', days: '365天', icon: '📅' },
                    {
                      value: 'quarter',
                      label: '1季',
                      days: '90天',
                      icon: '📊',
                    },
                    { value: 'month', label: '1月', days: '30天', icon: '📋' },
                    { value: 'week', label: '1周', days: '7天', icon: '📝' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type='button'
                      onClick={() => setNewKeyType(type.value as any)}
                      className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                        newKeyType === type.value
                          ? 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 shadow-lg shadow-orange-500/40 scale-105'
                          : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 hover:from-orange-50 hover:to-amber-50 dark:hover:from-orange-950/20 dark:hover:to-amber-950/20 border border-gray-200/50 dark:border-gray-700/50 hover:border-orange-300/50 dark:hover:border-orange-700/50'
                      }`}
                    >
                      {newKeyType === type.value && (
                        <div className='absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl' />
                      )}
                      <div
                        className={`text-2xl mb-1 ${newKeyType === type.value ? 'text-white' : ''}`}
                      >
                        {type.icon}
                      </div>
                      <div
                        className={`text-sm font-bold ${newKeyType === type.value ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {type.label}
                      </div>
                      <div
                        className={`text-xs ${newKeyType === type.value ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {type.days}
                      </div>
                      {newKeyType === type.value && (
                        <div className='absolute -inset-0.5 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 rounded-2xl blur-md opacity-40 -z-10 pointer-events-none' />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 生成数量 */}
              <div>
                <label className='block text-sm font-bold tracking-wide text-gray-700 dark:text-gray-300 mb-3'>
                  生成数量
                </label>
                <div className='relative'>
                  <div className='absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-xl opacity-10 rounded-xl pointer-events-none' />
                  <div className='relative flex items-center gap-3 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-slate-800 border-2 border-gray-200/50 dark:border-gray-700/50 rounded-xl px-4 py-3 transition-all duration-300 focus-within:border-orange-400/50 dark:focus-within:border-orange-600/50 focus-within:shadow-lg focus-within:shadow-orange-500/20'>
                    <button
                      type='button'
                      onClick={() =>
                        setNewKeyCount(Math.max(1, newKeyCount - 1))
                      }
                      disabled={newKeyCount <= 1}
                      className='w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold text-xl hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-orange-500/30'
                    >
                      -
                    </button>
                    <input
                      type='number'
                      min='1'
                      max='100'
                      value={newKeyCount}
                      onChange={(e) =>
                        setNewKeyCount(
                          Math.max(
                            1,
                            Math.min(100, parseInt(e.target.value) || 1),
                          ),
                        )
                      }
                      className='flex-1 text-center text-xl font-bold bg-transparent border-0 focus:outline-none text-gray-800 dark:text-gray-200'
                    />
                    <button
                      type='button'
                      onClick={() =>
                        setNewKeyCount(Math.min(100, newKeyCount + 1))
                      }
                      disabled={newKeyCount >= 100}
                      className='w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold text-xl hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-orange-500/30'
                    >
                      +
                    </button>
                  </div>
                  <div className='mt-2 text-center text-xs text-gray-500 dark:text-gray-400'>
                    每次最多生成 100 个卡密
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 - 固定在底部 */}
            <div className='relative pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6 shrink-0'>
              <div className='flex justify-end gap-3'>
                <button
                  type='button'
                  onClick={() => setShowCreateModal(false)}
                  className='inline-flex items-center px-6 py-3 text-white bg-gradient-to-br from-gray-400 to-slate-400 hover:from-gray-500 hover:to-slate-500 rounded-xl transition-all duration-300 shadow-lg shadow-gray-500/30 hover:shadow-xl hover:shadow-gray-500/40 hover:-translate-y-0.5 active:scale-95'
                >
                  <span className='font-medium'>取消</span>
                </button>
                <button
                  type='button'
                  onClick={handleCreateCardKeys}
                  disabled={createLoading}
                  className='inline-flex items-center px-8 py-3 text-white bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none'
                >
                  {createLoading ? (
                    <>
                      <RefreshCw className='w-5 h-5 mr-2 animate-spin' />
                      <span className='font-medium'>创建中...</span>
                    </>
                  ) : (
                    <>
                      <Plus className='w-5 h-5 mr-2' />
                      <span className='font-semibold'>创建</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 精美已创建卡密显示弹窗 */}
      {showCreatedKeys && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='relative bg-white/98 dark:bg-gray-900/98 backdrop-blur-3xl rounded-3xl p-8 max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl shadow-orange-500/20 border border-orange-200/30 dark:border-orange-800/30 animate-scale-in flex flex-col'>
            {/* 装饰性光晕 */}
            <div className='absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 rounded-full blur-3xl opacity-20' />
            <div className='absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-yellow-400 via-orange-400 to-amber-400 rounded-full blur-3xl opacity-20' />

            {/* 标题区域 */}
            <div className='relative flex justify-between items-start mb-6'>
              <div className='flex items-center gap-4'>
                <div className='relative'>
                  <div className='absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl blur-xl opacity-30 animate-pulse-soft' />
                  <div className='relative p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg shadow-emerald-500/30'>
                    <CheckCircle className='w-6 h-6 text-white' />
                  </div>
                </div>
                <div>
                  <h3 className='text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 bg-clip-text text-transparent'>
                    已创建 {createdKeys.length} 个卡密
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    卡密已保存到数据库
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setShowCreatedKeys(false)}
                className='inline-flex items-center p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-300'
              >
                <X className='w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors' />
              </button>
            </div>

            {/* 提示信息 */}
            <div className='relative mb-6 p-4 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-yellow-950/20 rounded-xl border border-orange-200/30 dark:border-orange-800/30'>
              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0 text-2xl'>💡</div>
                <p className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed'>
                  这些卡密已保存到数据库，您可以随时在卡密列表中查看和复制。建议立即复制并妥善保管。
                </p>
              </div>
            </div>

            {/* 复制全部按钮 */}
            <div className='relative mb-6'>
              <button
                type='button'
                onClick={copyAllCardKeys}
                className='inline-flex items-center justify-center w-full px-6 py-3.5 text-white bg-gradient-to-br from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95'
              >
                <Copy className='w-5 h-5 mr-3' />
                <span className='font-semibold'>
                  复制全部卡密 ({createdKeys.length} 个)
                </span>
              </button>
            </div>

            {/* 卡密列表 */}
            <div className='relative flex-1 overflow-y-auto space-y-3 pr-2'>
              {createdKeys.map((key, index) => (
                <div
                  key={index}
                  className='group relative flex items-center justify-between p-4 bg-gradient-to-r from-orange-50/50 via-amber-50/50 to-yellow-50/50 dark:from-orange-950/10 dark:via-amber-950/10 dark:to-yellow-950/10 rounded-2xl border border-orange-200/30 dark:border-orange-800/30 transition-all duration-300 hover:from-orange-100/70 hover:via-amber-100/70 hover:to-yellow-100/70 dark:hover:from-orange-950/20 dark:hover:via-amber-950/20 dark:hover:to-yellow-950/20 hover:shadow-lg hover:shadow-orange-500/15 hover:-translate-x-1'
                >
                  <div className='flex items-center gap-3 flex-1 min-w-0 mr-4'>
                    <div className='flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg text-white text-xs font-bold shadow-md shadow-orange-500/30'>
                      {index + 1}
                    </div>
                    <code className='font-mono text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 break-all bg-white/50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-orange-200/20 dark:border-orange-800/20'>
                      {key}
                    </code>
                  </div>
                  <button
                    type='button'
                    onClick={() => copyCardKey(key)}
                    className='inline-flex items-center px-4 py-2 text-white bg-gradient-to-br from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl transition-all duration-300 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 hover:scale-105 active:scale-95'
                  >
                    <Copy className='w-4 h-4 mr-2' />
                    <span className='font-medium text-sm'>复制</span>
                  </button>
                </div>
              ))}
            </div>

            {/* 底部关闭按钮 */}
            <div className='relative mt-6 pt-6 border-t border-orange-200/30 dark:border-orange-800/30'>
              <button
                type='button'
                onClick={() => setShowCreatedKeys(false)}
                className='inline-flex items-center justify-center w-full px-6 py-3.5 text-white bg-gradient-to-br from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 rounded-xl transition-all duration-300 shadow-lg shadow-gray-500/30 hover:shadow-xl hover:shadow-gray-500/40 hover:-translate-y-0.5 active:scale-95'
              >
                <span className='font-semibold'>关闭</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
