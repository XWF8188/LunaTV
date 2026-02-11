import React from 'react';

interface ExpirationReminderProps {
  daysRemaining?: number;
  expirationDate?: string;
  onRenewClick?: () => void;
}

export const ExpirationReminder: React.FC<ExpirationReminderProps> = ({
  daysRemaining,
  expirationDate,
  onRenewClick,
}) => {
  if (daysRemaining === undefined || daysRemaining === null) {
    return null;
  }

  if (daysRemaining <= 0) {
    return (
      <div className='bg-red-100 border-l-4 border-red-500 p-4 mb-4'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-bold text-red-800'>账号已过期</p>
            <p className='text-sm text-red-700'>请使用新卡密续期后继续使用</p>
            {expirationDate && (
              <p className='text-xs text-red-600 mt-1'>
                过期日期：{new Date(expirationDate).toLocaleDateString('zh-CN')}
              </p>
            )}
          </div>
          {onRenewClick && (
            <button
              onClick={onRenewClick}
              className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
            >
              立即续期
            </button>
          )}
        </div>
      </div>
    );
  }

  if (daysRemaining <= 30) {
    const warningColor =
      daysRemaining <= 7
        ? 'bg-orange-100 border-orange-500'
        : 'bg-yellow-100 border-yellow-500';
    const textColor =
      daysRemaining <= 7 ? 'text-orange-800' : 'text-yellow-800';
    const subTextColor =
      daysRemaining <= 7 ? 'text-orange-700' : 'text-yellow-700';

    return (
      <div className={`${warningColor} border-l-4 p-4 mb-4`}>
        <div className='flex items-center justify-between'>
          <div>
            <p className={`text-sm font-bold ${textColor}`}>
              账号即将过期（剩余 {daysRemaining} 天）
            </p>
            <p className={`text-sm ${subTextColor}`}>
              请及时使用新卡密续期，以免影响使用
            </p>
            {expirationDate && (
              <p className={`text-xs ${subTextColor} mt-1`}>
                过期日期：{new Date(expirationDate).toLocaleDateString('zh-CN')}
              </p>
            )}
          </div>
          {onRenewClick && (
            <button
              onClick={onRenewClick}
              className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors'
            >
              续期
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

interface ExpirationInfoProps {
  daysRemaining?: number;
  expirationDate?: string;
  showStatus?: boolean;
}

export const ExpirationInfo: React.FC<ExpirationInfoProps> = ({
  daysRemaining,
  expirationDate,
  showStatus = false,
}) => {
  if (
    daysRemaining === undefined ||
    daysRemaining === null ||
    !expirationDate
  ) {
    return showStatus ? (
      <div className='flex items-center space-x-2'>
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
          未设置有效期
        </span>
      </div>
    ) : null;
  }

  let statusColor = 'bg-green-100 text-green-800';
  let statusText = '正常';

  if (daysRemaining <= 0) {
    statusColor = 'bg-red-100 text-red-800';
    statusText = '已过期';
  } else if (daysRemaining <= 30) {
    statusColor = 'bg-yellow-100 text-yellow-800';
    statusText = '即将过期';
  }

  return (
    <div className='flex items-center space-x-2'>
      {showStatus && (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
        >
          {statusText}
        </span>
      )}
      <span className='text-sm text-gray-600'>
        有效期至：{new Date(expirationDate).toLocaleDateString('zh-CN')}
      </span>
      {daysRemaining > 0 && (
        <span className='text-xs text-gray-500'>
          （剩余 {daysRemaining} 天）
        </span>
      )}
    </div>
  );
};
