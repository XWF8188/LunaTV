'use client';

import { memo, ReactNode } from 'react';

interface RhythmGridProps {
  children: ReactNode;
  layout?: 'standard' | 'mixed' | 'hero' | 'wide';
}

function RhythmGrid({ children, layout = 'standard' }: RhythmGridProps) {
  const getLayoutClasses = () => {
    const layouts = {
      standard:
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6',
      mixed: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
      hero: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
      wide: 'grid grid-cols-1 gap-6',
    };
    return layouts[layout];
  };

  return <div className={getLayoutClasses()}>{children}</div>;
}

export default memo(RhythmGrid);
