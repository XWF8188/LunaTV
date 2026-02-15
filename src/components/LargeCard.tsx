'use client';

import { memo } from 'react';

interface LargeCardProps {
  title: string;
  description?: string;
  poster?: string;
  rate?: string;
  year?: string;
  href?: string;
  layout?: '16:9' | '21:9' | '4:3';
}

function LargeCard({
  title,
  description,
  poster,
  rate,
  year,
  href,
  layout = '16:9',
}: LargeCardProps) {
  const getAspectRatio = () => {
    const ratios = {
      '16:9': 'aspect-video',
      '21:9': 'aspect-[21/9]',
      '4:3': 'aspect-[4/3]',
    };
    return ratios[layout];
  };

  return (
    <a
      href={href}
      className='group relative block overflow-hidden rounded-3xl bg-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl hover:shadow-violet-900/20'
    >
      <div className={`relative ${getAspectRatio()}`}>
        {poster && (
          <img
            src={poster}
            alt={title}
            className='absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
          />
        )}

        <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

        <div className='absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

        <div className='absolute bottom-0 left-0 right-0 p-8 space-y-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500'>
          <div className='flex items-center gap-3 text-white/80'>
            {rate && (
              <span className='flex items-center gap-1 text-lg'>
                <span className='text-amber-400'>★</span>
                {rate}
              </span>
            )}
            {year && <span className='text-base'>{year}</span>}
          </div>

          <h3 className='text-2xl sm:text-3xl font-bold text-white leading-tight line-clamp-2'>
            {title}
          </h3>

          {description && (
            <p className='text-base text-white/70 line-clamp-3'>
              {description}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

export default memo(LargeCard);
