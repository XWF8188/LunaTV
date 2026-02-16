'use client';

import { useEffect, useState } from 'react';
import { Copy, Share2, Users, Award } from 'lucide-react';

interface InvitationInfo {
  code: string;
  inviteLink: string;
  totalInvites: number;
  totalRewards: number;
}

export default function InvitationPage() {
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchInvitationInfo();
  }, []);

  const fetchInvitationInfo = async () => {
    try {
      const response = await fetch('/api/invitation/info', {
        headers: {
          'x-username': localStorage.getItem('username') || '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setInfo(data);
      }
    } catch (error) {
      console.error('获取邀请信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const shareLink = async () => {
    if (!info) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '邀请你注册',
          text: `使用我的邀请码 ${info.code} 注册，可获得积分奖励！`,
          url: info.inviteLink,
        });
      } catch (error) {
        console.error('分享失败:', error);
      }
    } else {
      copyCode(info.inviteLink);
    }
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

  if (!info) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <p className='text-gray-600'>加载邀请信息失败</p>
          <button
            onClick={fetchInvitationInfo}
            className='mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8 px-4'>
      <div className='max-w-2xl mx-auto'>
        <h1 className='text-3xl font-bold text-center mb-8'>我的邀请</h1>

        <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold flex items-center'>
              <Share2 className='mr-2 h-5 w-5' />
              邀请码
            </h2>
            <button
              onClick={() => copyCode(info.code)}
              className='flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm'
            >
              <Copy className='mr-1 h-4 w-4' />
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <div className='bg-gray-100 rounded-lg p-4 mb-4'>
            <code className='text-lg font-mono break-all'>{info.code}</code>
          </div>
          <button
            onClick={shareLink}
            className='w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600'
          >
            <Share2 className='mr-2 h-5 w-5' />
            分享邀请链接
          </button>
        </div>

        <div className='grid grid-cols-2 gap-4 mb-6'>
          <div className='bg-white rounded-lg shadow-md p-6'>
            <div className='flex items-center mb-2'>
              <Users className='mr-2 h-5 w-5 text-blue-500' />
              <h3 className='font-semibold'>邀请人数</h3>
            </div>
            <p className='text-3xl font-bold text-blue-600'>
              {info.totalInvites}
            </p>
          </div>
          <div className='bg-white rounded-lg shadow-md p-6'>
            <div className='flex items-center mb-2'>
              <Award className='mr-2 h-5 w-5 text-green-500' />
              <h3 className='font-semibold'>获得奖励</h3>
            </div>
            <p className='text-3xl font-bold text-green-600'>
              {info.totalRewards}
            </p>
          </div>
        </div>

        <div className='bg-blue-50 rounded-lg p-6'>
          <h3 className='font-semibold mb-3'>邀请规则</h3>
          <ul className='space-y-2 text-sm text-gray-700'>
            <li>1. 分享邀请码或链接给好友</li>
            <li>2. 好友通过邀请码注册成功，您将获得积分奖励</li>
            <li>3. 同一IP地址注册多个账号只计算一次</li>
            <li>4. 积分可用于兑换一周卡密</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
