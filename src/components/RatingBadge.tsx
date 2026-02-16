'use client';

import { Star } from 'lucide-react';
import { memo } from 'react';

interface RatingBadgeProps {
  rate: string;
  size?: 'small' | 'medium' | 'large';
  showNumber?: boolean;
}

function RatingBadge({
  rate,
  size = 'small',
  showNumber = true,
}: RatingBadgeProps) {
  const rateNum = parseFloat(rate);

  const getSizeClasses = () => {
    const sizes = {
      small: { icon: 12, text: 'xs', padding: 'px-2 py-0.5' },
      medium: { icon: 14, text: 'sm', padding: 'px-2.5 py-1' },
      large: { icon: 16, text: 'base', padding: 'px-3 py-1.5' },
    };
    return sizes[size];
  };

  const sizeClasses = getSizeClasses();

  const getStarColor = () => {
    if (rateNum >= 8.5)
      return 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]';
    if (rateNum >= 7.0)
      return 'text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.5)]';
    if (rateNum >= 6.0)
      return 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]';
    return 'text-gray-400';
  };

  return (
    <div
      className={`flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg ${sizeClasses.padding} transition-all duration-300 hover:bg-black/70 hover:scale-105`}
    >
      <Star
        size={sizeClasses.icon}
        className={`fill-current ${getStarColor()} transition-colors duration-300`}
      />
      {showNumber && (
        <span className={`text-${sizeClasses.text} font-bold text-white`}>
          {rate}
        </span>
      )}
    </div>
  );
}

export default memo(RatingBadge);
