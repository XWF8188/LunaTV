import { LucideIcon, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface SectionTitleProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  viewAllLink?: string;
}

export default function SectionTitle({
  title,
  icon: Icon,
  iconColor = 'text-orange-500',
  viewAllLink,
}: SectionTitleProps) {
  return (
    <div className='flex items-center justify-between mb-6'>
      <div className='flex items-center gap-3'>
        {Icon && (
          <div
            className={`${iconColor} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon size={24} strokeWidth={2.5} />
          </div>
        )}

        <h2 className='text-2xl sm:text-3xl font-bold text-gray-800 dark:text-orange-100'>
          {title}
        </h2>
      </div>

      {viewAllLink && (
        <Link
          href={viewAllLink}
          className='flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-orange-200 dark:hover:text-orange-100 transition-colors duration-200'
        >
          <span>查看全部</span>
          <ChevronRight
            size={16}
            className='transition-transform duration-200 group-hover:translate-x-1'
          />
        </Link>
      )}
    </div>
  );
}
