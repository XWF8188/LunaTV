/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  Box,
  Cat,
  Clover,
  Film,
  Globe,
  Home,
  PlaySquare,
  Radio,
  Star,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string;
  activeGradient: string;
  activeTextColor: string;
  hoverBg: string;
}

interface MobileBottomNavProps {
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const currentActive = activePath ?? pathname;

  const [navItems, setNavItems] = useState<NavItem[]>([
    {
      icon: Home,
      label: '首页',
      href: '/',
      activeGradient: 'bg-gradient-to-r from-violet-600 to-purple-600',
      activeTextColor: 'text-white',
      hoverBg: 'hover:bg-violet-500/20',
    },
    {
      icon: Globe,
      label: '源浏览',
      href: '/source-browser',
      activeGradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      activeTextColor: 'text-white',
      hoverBg: 'hover:bg-blue-500/20',
    },
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie',
      activeGradient: 'bg-gradient-to-r from-pink-500 to-rose-500',
      activeTextColor: 'text-white',
      hoverBg: 'hover:bg-pink-500/20',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
      activeGradient: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      activeTextColor: 'text-white',
      hoverBg: 'hover:bg-purple-500/20',
    },
    {
      icon: PlaySquare,
      label: '短剧',
      href: '/shortdrama',
      activeGradient: 'bg-gradient-to-r from-orange-500 to-red-500',
      activeTextColor: 'text-white',
      hoverBg: 'hover:bg-orange-500/20',
    },
    {
      icon: Cat,
      label: '动漫',
      href: '/douban?type=anime',
      activeGradient: 'bg-gradient-to-r from-emerald-400 to-teal-500',
      activeTextColor: 'text-white',
      hoverBg: 'hover:bg-emerald-500/20',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=show',
      activeGradient: 'bg-gradient-to-r from-amber-400 to-orange-500',
      activeTextColor: 'text-white',
      hoverBg: 'hover:bg-amber-500/20',
    },
    {
      icon: Radio,
      label: '直播',
      href: '/live',
      activeGradient: 'bg-gradient-to-r from-red-500 to-pink-500',
      activeTextColor: 'text-white',
      hoverBg: 'hover:bg-red-500/20',
    },
  ]);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setNavItems((prevItems) => {
        if (prevItems.some((item) => item.label === '自定义')) return prevItems;
        return [
          ...prevItems,
          {
            icon: Star,
            label: '自定义',
            href: '/douban?type=custom',
            activeGradient: 'bg-gradient-to-r from-yellow-400 to-amber-500',
            activeTextColor: 'text-white',
            hoverBg: 'hover:bg-yellow-500/20',
          },
        ];
      });
    }
  }, []);

  const isActive = useCallback(
    (href: string) => {
      const typeMatch = href.match(/type=([^&]+)/)?.[1];
      const decodedActive = decodeURIComponent(currentActive);
      const decodedItemHref = decodeURIComponent(href);

      if (decodedActive === decodedItemHref) return true;

      if (href === '/' && decodedActive === '/') return true;

      if (
        href === '/source-browser' &&
        decodedActive.startsWith('/source-browser')
      )
        return true;

      if (href === '/shortdrama' && decodedActive.startsWith('/shortdrama'))
        return true;

      if (href === '/live' && decodedActive.startsWith('/live')) return true;

      if (
        typeMatch &&
        decodedActive.startsWith('/douban') &&
        decodedActive.includes(`type=${typeMatch}`)
      ) {
        return true;
      }

      return false;
    },
    [currentActive],
  );

  const scrollToActiveItem = useCallback(() => {
    const activeIndex = navItems.findIndex((item) => isActive(item.href));
    if (activeIndex === -1) return;

    const activeItem = itemRefs.current[activeIndex];
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [navItems, isActive]);

  useEffect(() => {
    const timer = setTimeout(scrollToActiveItem, 100);
    return () => clearTimeout(timer);
  }, [currentActive, scrollToActiveItem]);

  return (
    <nav
      className={cn(
        'md:hidden fixed left-4 right-4 z-600',
        'bottom-6',
        'bg-black/70 dark:bg-black/80',
        'backdrop-blur-xl',
        'rounded-3xl',
        'border border-white/10',
        'shadow-2xl shadow-black/50',
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex items-center justify-around px-3 py-3',
          'overflow-x-auto',
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {navItems.map((item, index) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-[60px] flex-1',
                'py-2 px-1.5',
                'rounded-2xl',
                'transition-all duration-300',
                'active:scale-95',
                active
                  ? `${item.activeGradient} ${item.activeTextColor} shadow-lg shadow-violet-500/30`
                  : 'text-gray-400 hover:bg-white/5',
              )}
            >
              <Icon
                className={cn(
                  'w-6 h-6 mb-1',
                  'transition-all duration-300',
                  active ? 'scale-110' : 'scale-100',
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium',
                  'transition-all duration-300',
                  active ? 'text-white' : 'text-gray-400',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
