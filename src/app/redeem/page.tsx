'use client';

import { useEffect, useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle, History } from 'lucide-react';

interface BalanceData {
  balance: number;
}

interface HistoryData {
  records: Array<{
    id: string;
    type: 'earn' | 'redeem';
    amount: number;
    reason: string;
    relatedUser?: string;
    createdAt: number;
  }>;
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  page: number;
  pageSize: number;
  total: number;
}

interface RedeemResponse {
  success: boolean;
  cardKey?: string;
  error?: string;
}

export default function RedeemPage() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResponse | null>(null);
  const [config, setConfig] = useState<{
    rewardPoints: number;
    redeemThreshold: number;
  } | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, [historyPage]);

  const fetchData = async () => {
    try {
      const username = localStorage.getItem('username') || '';

      const [balanceRes, historyRes, configRes] = await Promise.all([
        fetch('/api/points/balance', {
          headers: { 'x-username': username },
        }),
        fetch(`/api/points/history?page=${historyPage}&pageSize=10`, {
          headers: { 'x-username': username },
        }),
        fetch('/api/admin/invitation-config'),
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.balance);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig({
          rewardPoints: configData.rewardPoints,
          redeemThreshold: configData.redeemThreshold,
        });
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    setRedeeming(true);
    setRedeemResult(null);

    try {
      const username = localStorage.getItem('username') || '';
      const response = await fetch('/api/redeem/cardkey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': username,
        },
      });

      const result = await response.json();
      setRedeemResult(result);

      if (result.success) {
        fetchData();
      }
    } catch (error) {
      console.error('兑换失败:', error);
      setRedeemResult({
        success: false,
        error: '兑换失败，请稍后重试',
      });
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const canRedeem = config && balance >= config.redeemThreshold;

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
        <h1 className='text-3xl font-bold text-center mb-8'>积分兑换</h1>

        <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold flex items-center'>
              <CreditCard className='mr-2 h-5 w-5' />
              我的积分
            </h2>
            <span className='text-3xl font-bold text-blue-600'>{balance}</span>
          </div>
          {config && (
            <div className='space-y-2 text-sm text-gray-600'>
              <p>邀请一人获得: {config.rewardPoints} 积分</p>
              <p>兑换一周卡密需要: {config.redeemThreshold} 积分</p>
            </div>
          )}
        </div>

        <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
          <h2 className='text-xl font-semibold mb-4'>兑换一周卡密</h2>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-600'>
                消耗 {config?.redeemThreshold || 500} 积分
              </p>
              <p className='text-sm text-gray-500 mt-1'>卡密有效期为7天</p>
            </div>
            <button
              onClick={handleRedeem}
              disabled={!canRedeem || redeemResult?.success}
              className={`px-6 py-3 rounded-lg font-semibold ${
                canRedeem && !redeemResult?.success
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {redeeming
                ? '兑换中...'
                : redeemResult?.success
                  ? '已兑换'
                  : '立即兑换'}
            </button>
          </div>
        </div>

        {redeemResult && (
          <div
            className={`rounded-lg p-4 mb-6 flex items-start ${
              redeemResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            {redeemResult.success ? (
              <CheckCircle className='h-5 w-5 text-green-500 mr-3 flex-shrink-0' />
            ) : (
              <AlertCircle className='h-5 w-5 text-red-500 mr-3 flex-shrink-0' />
            )}
            <div className='flex-1'>
              <p
                className={`font-semibold ${
                  redeemResult.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {redeemResult.success ? '兑换成功' : '兑换失败'}
              </p>
              {redeemResult.cardKey && (
                <p className='mt-2 text-sm text-gray-700'>
                  卡密:{' '}
                  <code className='bg-gray-100 px-2 py-1 rounded'>
                    {redeemResult.cardKey}
                  </code>
                </p>
              )}
              {redeemResult.error && (
                <p className='mt-1 text-sm text-red-700'>
                  {redeemResult.error}
                </p>
              )}
            </div>
          </div>
        )}

        <div className='bg-white rounded-lg shadow-md p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold flex items-center'>
              <History className='mr-2 h-5 w-5' />
              积分明细
            </h2>
            {history && (
              <div className='flex items-center space-x-2'>
                <button
                  onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                  disabled={historyPage === 1}
                  className='px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50'
                >
                  上一页
                </button>
                <span className='text-sm text-gray-600'>
                  第 {historyPage} 页
                </span>
                <button
                  onClick={() => setHistoryPage(historyPage + 1)}
                  disabled={
                    historyPage >= Math.ceil(history.total / history.pageSize)
                  }
                  className='px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50'
                >
                  下一页
                </button>
              </div>
            )}
          </div>
          {history && history.records.length > 0 ? (
            <div className='space-y-3'>
              {history.records.map((record) => (
                <div key={record.id} className='border-b pb-3 last:border-0'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='font-medium'>{record.reason}</p>
                      {record.relatedUser && (
                        <p className='text-sm text-gray-500 mt-1'>
                          相关用户: {record.relatedUser}
                        </p>
                      )}
                    </div>
                    <span
                      className={`font-semibold ${
                        record.type === 'earn'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {record.type === 'earn' ? '+' : ''}
                      {record.amount}
                    </span>
                  </div>
                  <p className='text-sm text-gray-500 mt-1'>
                    {formatDate(record.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-gray-500 text-center py-4'>暂无积分记录</p>
          )}
        </div>
      </div>
    </div>
  );
}
