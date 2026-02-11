'use client';

import { useState, useEffect } from 'react';
import {
  Copy,
  Trash2,
  RefreshCw,
  Download,
  Plus,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface ActivationCode {
  code: string;
  status: 'unused' | 'used';
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
  createdBy: string;
}

export default function ActivationCodesPage() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used'>(
    'all',
  );

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/activation-codes');
      if (!res.ok) {
        throw new Error('获取卡密列表失败');
      }
      const data = await res.json();
      setCodes(data.codes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取卡密列表失败');
    } finally {
      setLoading(false);
    }
  };

  const generateCodes = async () => {
    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/admin/activation-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', count: generateCount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '生成卡密失败');
      }

      const data = await res.json();
      setCodes([...codes, ...data.codes]);
      setSuccess(`成功生成 ${data.count} 个卡密`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成卡密失败');
    } finally {
      setGenerating(false);
    }
  };

  const deleteCode = async (code: string) => {
    if (!confirm('确定要删除此卡密吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/activation-codes/${code}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('删除卡密失败');
      }

      setCodes(codes.filter((c) => c.code !== code));
      setSuccess('卡密删除成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除卡密失败');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess('卡密已复制到剪贴板');
    setTimeout(() => setSuccess(null), 2000);
  };

  const exportCodes = () => {
    const filteredCodes = codes.filter((c) => {
      if (filterStatus === 'all') return true;
      return c.status === filterStatus;
    });

    const csvContent = [
      '卡密,状态,创建时间,使用时间,使用用户,创建者',
      ...filteredCodes.map(
        (c) =>
          `${c.code},${c.status},${c.createdAt},${c.usedAt || ''},${c.usedBy || ''},${c.createdBy}`,
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activation-codes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredCodes = codes.filter((c) => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const unusedCount = codes.filter((c) => c.status === 'unused').length;
  const usedCount = codes.filter((c) => c.status === 'used').length;

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
          卡密管理
        </h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          管理用户注册和续期使用的卡密
        </p>
      </div>

      {error && (
        <div className='mb-4 flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'>
          <AlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
          <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
        </div>
      )}

      {success && (
        <div className='mb-4 flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50'>
          <CheckCircle className='h-5 w-5 text-green-600 dark:text-green-400' />
          <p className='text-sm text-green-600 dark:text-green-400'>
            {success}
          </p>
        </div>
      )}

      <div className='bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
          <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>总卡密数</p>
            <p className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
              {codes.length}
            </p>
          </div>
          <div className='bg-green-50 dark:bg-green-900/20 p-4 rounded-lg'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>未使用</p>
            <p className='text-2xl font-bold text-green-600 dark:text-green-400'>
              {unusedCount}
            </p>
          </div>
          <div className='bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>已使用</p>
            <p className='text-2xl font-bold text-yellow-600 dark:text-yellow-400'>
              {usedCount}
            </p>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
          <div className='flex items-center gap-4'>
            <input
              type='number'
              min='1'
              max='1000'
              value={generateCount}
              onChange={(e) => setGenerateCount(Number(e.target.value))}
              className='w-24 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none'
            />
            <button
              onClick={generateCodes}
              disabled={generating}
              className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Plus className='h-4 w-4' />
              {generating ? '生成中...' : '生成卡密'}
            </button>
            <button
              onClick={exportCodes}
              disabled={codes.length === 0}
              className='inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Download className='h-4 w-4' />
              导出
            </button>
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterStatus('unused')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'unused'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
              }`}
            >
              未使用
            </button>
            <button
              onClick={() => setFilterStatus('used')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'used'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
              }`}
            >
              已使用
            </button>
            <button
              onClick={fetchCodes}
              disabled={loading}
              className='ml-2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50'
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className='bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center text-gray-500 dark:text-gray-400'>
            加载中...
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className='p-8 text-center text-gray-500 dark:text-gray-400'>
            {filterStatus === 'all' ? '暂无卡密' : '暂无对应状态的卡密'}
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-zinc-700'>
              <thead className='bg-gray-50 dark:bg-zinc-700'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    卡密
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    状态
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    创建时间
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    使用信息
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    创建者
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-700'>
                {filteredCodes.map((code) => (
                  <tr
                    key={code.code}
                    className='hover:bg-gray-50 dark:hover:bg-zinc-700'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <code className='text-sm font-mono bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded'>
                          {code.code}
                        </code>
                        <button
                          onClick={() => copyCode(code.code)}
                          className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                          title='复制'
                        >
                          <Copy className='h-4 w-4' />
                        </button>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          code.status === 'unused'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {code.status === 'unused' ? '未使用' : '已使用'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                      {new Date(code.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                      {code.status === 'used' ? (
                        <div>
                          <div>{code.usedBy}</div>
                          <div className='text-xs'>
                            {code.usedAt
                              ? new Date(code.usedAt).toLocaleString('zh-CN')
                              : ''}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                      {code.createdBy}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <button
                        onClick={() => deleteCode(code.code)}
                        className='text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors'
                        title='删除'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
