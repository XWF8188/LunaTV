'use client';

import { useEffect, useState } from 'react';
import { Key, Copy, CheckCircle, AlertCircle, Clock, User } from 'lucide-react';

interface UserCardKey {
  id: string;
  keyHash: string;
  username: string;
  type: 'year' | 'quarter' | 'month' | 'week';
  status: 'unused' | 'used' | 'expired';
  source: 'invitation' | 'redeem' | 'manual';
  plainKey?: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  usedBy?: string;
  notes?: string;
}

interface MyCardKeysResponse {
  cardKeys: UserCardKey[];
}

export default function MyCardKeysPage() {
  const [cardKeys, setCardKeys] = useState<UserCardKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetchCardKeys();
  }, []);

  const fetchCardKeys = async () => {
    try {
      const username = localStorage.getItem('username') || '';
      const response = await fetch('/api/cardkeys/my', {
        headers: { 'x-username': username },
      });

      if (response.ok) {
        const data: MyCardKeysResponse = await response.json();
        setCardKeys(data.cardKeys);
      }
    } catch (error) {
      console.error('获取卡密失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCardKey = async (plainKey: string, id: string) => {
    try {
      await navigator.clipboard.writeText(plainKey);
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      year: '年卡',
      quarter: '季卡',
      month: '月卡',
      week: '周卡',
    };
    return typeMap[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      unused: { text: '未使用', color: 'bg-green-100 text-green-800' },
      used: { text: '已使用', color: 'bg-gray-100 text-gray-800' },
      expired: { text: '已过期', color: 'bg-red-100 text-red-800' },
    };
    const badge = statusMap[status] || {
      text: status,
      color: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getSourceText = (source: string) => {
    const sourceMap: Record<string, string> = {
      invitation: '邀请奖励',
      redeem: '积分兑换',
      manual: '管理员发放',
    };
    return sourceMap[source] || source;
  };

  const isExpired = (expiresAt: number) => {
    return Date.now() > expiresAt;
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
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold text-center mb-8'>我的卡密</h1>

        {cardKeys.length === 0 ? (
          <div className='bg-white rounded-lg shadow-md p-12 text-center'>
            <Key className='h-16 w-16 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-600 text-lg'>暂无卡密</p>
            <p className='text-gray-500 text-sm mt-2'>
              邀请好友注册可获得积分，使用积分可兑换卡密
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {cardKeys.map((cardKey) => (
              <div
                key={cardKey.id}
                className='bg-white rounded-lg shadow-md p-6'
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-start flex-1'>
                    <div className='bg-blue-100 rounded-lg p-3 mr-4'>
                      <Key className='h-6 w-6 text-blue-600' />
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <h3 className='text-lg font-semibold'>
                          {getTypeText(cardKey.type)}
                        </h3>
                        {getStatusBadge(cardKey.status)}
                      </div>
                      <p className='text-sm text-gray-500 mb-1'>
                        来源: {getSourceText(cardKey.source)}
                      </p>
                      {cardKey.notes && (
                        <p className='text-sm text-gray-500 mb-1'>
                          备注: {cardKey.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {cardKey.plainKey &&
                  cardKey.status === 'unused' &&
                  !isExpired(cardKey.expiresAt) && (
                    <div className='bg-gray-50 rounded-lg p-4 mb-4'>
                      <p className='text-sm text-gray-600 mb-2'>卡密密钥:</p>
                      <div className='flex items-center space-x-2'>
                        <code className='flex-1 bg-white border rounded px-3 py-2 font-mono text-sm'>
                          {cardKey.plainKey}
                        </code>
                        <button
                          onClick={() =>
                            copyCardKey(cardKey.plainKey!, cardKey.id)
                          }
                          className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                            copied === cardKey.id
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          <Copy className='h-4 w-4 mr-2' />
                          {copied === cardKey.id ? '已复制' : '复制'}
                        </button>
                      </div>
                    </div>
                  )}

                <div className='grid grid-cols-2 gap-4 text-sm text-gray-600'>
                  <div className='flex items-center'>
                    <Clock className='h-4 w-4 mr-2' />
                    <div>
                      <p className='text-gray-500'>创建时间</p>
                      <p className='font-medium'>
                        {formatDate(cardKey.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center'>
                    <Clock className='h-4 w-4 mr-2' />
                    <div>
                      <p className='text-gray-500'>过期时间</p>
                      <p
                        className={`font-medium ${isExpired(cardKey.expiresAt) ? 'text-red-600' : ''}`}
                      >
                        {formatDate(cardKey.expiresAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {cardKey.status === 'used' && (
                  <div className='mt-4 pt-4 border-t'>
                    <div className='flex items-center text-sm text-gray-600'>
                      <User className='h-4 w-4 mr-2' />
                      <div>
                        <p className='text-gray-500'>使用信息</p>
                        <p className='font-medium'>
                          {cardKey.usedBy || '未知'} 于{' '}
                          {formatDate(cardKey.usedAt!)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className='mt-8 bg-blue-50 rounded-lg p-6'>
          <h3 className='font-semibold mb-3'>使用说明</h3>
          <ul className='space-y-2 text-sm text-gray-700'>
            <li>1. 复制卡密密钥后,可在注册或登录时绑定使用</li>
            <li>2. 卡密可以自用,也可以分享给好友使用</li>
            <li>3. 卡密过期后将无法使用,请注意有效期</li>
            <li>4. 一个卡密只能被一个账号绑定使用</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
