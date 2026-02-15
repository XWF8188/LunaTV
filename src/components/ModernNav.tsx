/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  Cat,
  Clover,
  Film,
  Globe,
  Home,
  MoreHorizontal,
  PlaySquare,
  Radio,
  Search,
  Sparkles,
  Star,
  Tv,
  X,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FastLink } from './FastLink';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useSite } from './SiteProvider';

interface NavItem {
  icon: any;
  label: string;
  href: string;
  color: string;
  gradient: string;
}

interface ModernNavProps {
  showAIButton?: boolean;
  onAIButtonClick?: () => void;
}

export default function ModernNav({
  showAIButton = false,
  onAIButtonClick,
}: ModernNavProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(pathname);
  const { siteName } = useSite();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [menuItems, setMenuItems] = useState<NavItem[]>([
    {
      icon: Home,
      label: '首页',
      href: '/',
      color: 'text-orange-500',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: Search,
      label: '搜索',
      href: '/search',
      color: 'text-amber-500',
      gradient: 'from-amber-500 to-yellow-500',
    },
    {
      icon: Globe,
      label: '源浏览器',
      href: '/source-browser',
      color: 'text-yellow-500',
      gradient: 'from-yellow-500 to-orange-400',
    },
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie',
      color: 'text-red-500',
      gradient: 'from-red-500 to-orange-500',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
      color: 'text-orange-600',
      gradient: 'from-orange-600 to-amber-600',
    },
    {
      icon: PlaySquare,
      label: '短剧',
      href: '/shortdrama',
      color: 'text-amber-600',
      gradient: 'from-amber-600 to-orange-500',
    },
    {
      icon: Cat,
      label: '动漫',
      href: '/douban?type=anime',
      color: 'text-pink-500',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=show',
      color: 'text-orange-500',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: Radio,
      label: '直播',
      href: '/live',
      color: 'text-rose-500',
      gradient: 'from-rose-500 to-red-500',
    },
  ]);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setMenuItems((prevItems) => [
        ...prevItems,
        {
          icon: Star,
          label: '自定义',
          href: '/douban?type=custom',
          color: 'text-amber-500',
          gradient: 'from-amber-500 to-orange-500',
        },
      ]);
    }
  }, []);

  useEffect(() => {
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    setActive(fullPath);
  }, [pathname, searchParams]);

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];
    const decodedActive = decodeURIComponent(active);
    const decodedHref = decodeURIComponent(href);

    return (
      decodedActive === decodedHref ||
      (decodedActive.startsWith('/douban') &&
        typeMatch &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <>
      {/* Desktop Top Navigation - 2025 Premium Style */}
      <nav className='hidden md:block fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-white/95 via-white/90 to-white/85 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-900/85 backdrop-blur-2xl border-b border-orange-100/50 dark:border-orange-900/30 shadow-lg shadow-orange-500/5'>
        <div className='max-w-[2560px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20'>
          <div className='flex items-center justify-between h-20 gap-4'>
            {/* Logo */}
            <FastLink href='/' className='shrink-0 group'>
              <div className='text-2xl font-bold bg-linear-to-r from-orange-500 via-amber-500 to-yellow-500 dark:from-orange-400 dark:via-amber-400 dark:to-yellow-400 bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg group-hover:drop-shadow-orange-500/30'>
                {siteName}
              </div>
            </FastLink>

            {/* Navigation Items */}
            <div className='flex items-center justify-center gap-2 lg:gap-3 overflow-x-auto scrollbar-hide flex-1 px-4'>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <FastLink
                    key={item.label}
                    href={item.href}
                    useTransitionNav
                    onClick={() => setActive(item.href)}
                    className='group relative flex items-center gap-2.5 px-4 lg:px-5 py-2.5 rounded-2xl transition-all duration-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 dark:hover:from-orange-900/20 dark:hover:to-amber-900/20 whitespace-nowrap shrink-0 hover:shadow-lg hover:shadow-orange-500/10'
                  >
                    {/* Active indicator with glow */}
                    {active && (
                      <>
                        <div
                          className={`absolute inset-0 bg-linear-to-r ${item.gradient} opacity-15 rounded-2xl animate-pulse`}
                        />
                        <div
                          className={`absolute inset-0 bg-linear-to-r ${item.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}
                        />
                      </>
                    )}

                    {/* Icon */}
                    <div className='relative'>
                      <Icon
                        className={`w-5 h-5 transition-all duration-300 ${
                          active
                            ? `${item.color} drop-shadow-lg drop-shadow-orange-500/50`
                            : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 group-hover:scale-110'
                        } ${active ? 'scale-110' : ''}`}
                      />
                      {active && (
                        <div
                          className={`absolute inset-0 bg-linear-to-r ${item.gradient} blur-xl opacity-30 rounded-full`}
                        />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-sm font-medium transition-all duration-300 ${
                        active
                          ? `${item.color} font-bold`
                          : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100'
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Bottom active border with glow */}
                    {active && (
                      <>
                        <div
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-linear-to-r ${item.gradient} rounded-full shadow-lg shadow-orange-500/50`}
                        />
                        <div
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-linear-to-r ${item.gradient} blur-md opacity-50`}
                        />
                      </>
                    )}
                  </FastLink>
                );
              })}
            </div>

            {/* Right Side Actions - ✨ AI Button, Theme Toggle & User Menu */}
            <div className='flex items-center gap-3 shrink-0'>
              {showAIButton && onAIButtonClick && (
                <button
                  onClick={onAIButtonClick}
                  className='relative p-2.5 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 active:scale-95 transition-all duration-200 shadow-lg shadow-orange-500/30 group'
                  aria-label='AI 推荐'
                >
                  <Sparkles className='h-5 w-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300' />
                  <div className='absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl' />
                </button>
              )}
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* More Menu Modal - Premium Style */}
      {showMoreMenu && (
        <div
          className='md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm'
          style={{ zIndex: 2147483647 }}
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className='absolute bottom-24 left-4 right-4 bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-900/95 dark:to-gray-900/90 backdrop-blur-3xl rounded-3xl shadow-2xl shadow-orange-500/20 border border-orange-100/50 dark:border-orange-900/30 overflow-hidden animate-slide-in-up'
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className='flex items-center justify-between px-6 py-5 border-b border-orange-100/50 dark:border-orange-900/30 bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-orange-900/20 dark:to-amber-900/20'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-orange-100'>
                全部分类
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className='p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-all duration-200 group'
              >
                <X className='w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-orange-500 transition-colors' />
              </button>
            </div>

            {/* All menu items in grid */}
            <div className='grid grid-cols-4 gap-3 p-4'>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <FastLink
                    key={item.label}
                    href={item.href}
                    useTransitionNav
                    onClick={() => {
                      setActive(item.href);
                      setShowMoreMenu(false);
                    }}
                    className='flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 active:scale-95 hover:bg-gradient-to-br hover:from-orange-50 hover:to-amber-50 dark:hover:from-orange-900/20 dark:hover:to-amber-900/20 group'
                  >
                    <div
                      className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative ${
                        active
                          ? `bg-linear-to-br ${item.gradient} shadow-lg shadow-orange-500/30`
                          : 'bg-gray-100 dark:bg-gray-800 group-hover:shadow-md'
                      }`}
                    >
                      {active && (
                        <>
                          <div
                            className={`absolute inset-0 bg-linear-to-br ${item.gradient} blur-xl opacity-40 animate-pulse`}
                          />
                          <div
                            className={`absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl`}
                          />
                        </>
                      )}
                      <Icon
                        className={`w-7 h-7 ${
                          active
                            ? 'text-white drop-shadow-lg'
                            : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-500 transition-colors'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors duration-300 ${
                        active
                          ? `${item.color} font-semibold`
                          : 'text-gray-700 dark:text-gray-300 group-hover:text-orange-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </FastLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - Premium Style */}
      <nav
        className='md:hidden fixed left-0 right-0 z-40 bg-gradient-to-t from-white/95 via-white/90 to-white/85 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-900/85 backdrop-blur-2xl border-t border-orange-100/50 dark:border-orange-900/30 shadow-xl shadow-orange-500/10 dark:shadow-2xl dark:shadow-orange-500/20'
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className='flex items-center justify-around px-2 py-3'>
          {/* Show first 4 items + More button */}
          {menuItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <FastLink
                key={item.label}
                href={item.href}
                useTransitionNav
                onClick={() => setActive(item.href)}
                className='flex flex-col items-center justify-center min-w-[64px] flex-1 py-2.5 px-2 transition-all duration-200 active:scale-95 group'
              >
                <div className='relative mb-1.5'>
                  <Icon
                    className={`w-6 h-6 transition-all duration-200 ${
                      active
                        ? `${item.color} drop-shadow-lg drop-shadow-orange-500/50 scale-110`
                        : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-500 group-hover:scale-110'
                    }`}
                  />
                  {active && (
                    <>
                      <div
                        className={`absolute inset-0 bg-linear-to-r ${item.gradient} blur-xl opacity-40 rounded-full animate-pulse`}
                      />
                      <div
                        className={`absolute -inset-1 bg-linear-to-r ${item.gradient} opacity-0 rounded-full animate-ping`}
                        style={{ animationDuration: '2s' }}
                      />
                    </>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium transition-colors duration-200 ${
                    active
                      ? `${item.color} font-semibold`
                      : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-500'
                  }`}
                >
                  {item.label}
                </span>
              </FastLink>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className='flex flex-col items-center justify-center min-w-[64px] flex-1 py-2.5 px-2 transition-all duration-200 active:scale-95 group'
          >
            <MoreHorizontal className='w-6 h-6 mb-1.5 text-gray-600 dark:text-gray-400 group-hover:text-orange-500 group-hover:scale-110 transition-all duration-200' />
            <span className='text-[11px] font-medium text-gray-600 dark:text-gray-400 group-hover:text-orange-500 transition-colors duration-200'>
              更多
            </span>
          </button>
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className='hidden md:block h-20' />
      <div className='md:hidden h-24' />
    </>
  );
}
