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
      {/* Desktop Top Navigation - Premium Luxurious Style */}
      <nav className='hidden md:block fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-white/98 via-white/95 to-white/92 dark:from-gray-900/98 dark:via-gray-900/95 dark:to-gray-900/92 backdrop-blur-3xl border-b border-gradient-to-b from-orange-200/40 via-orange-100/30 to-amber-50/20 dark:from-orange-900/40 dark:via-orange-800/30 dark:to-amber-900/20 shadow-2xl shadow-orange-500/8 dark:shadow-orange-500/12 transition-all duration-500'>
        <div className='max-w-[2560px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20'>
          <div className='flex items-center justify-between h-[88px] gap-4'>
            {/* Enhanced Logo with animated gradient and glow */}
            <FastLink href='/' className='shrink-0 group'>
              <div className='relative'>
                <div className='absolute -inset-2 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 dark:from-orange-300 dark:via-amber-300 dark:to-yellow-300 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 group-hover:blur-2xl transition-all duration-500 animate-pulse-soft' />
                <div className='relative text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 dark:from-orange-400 dark:via-amber-400 dark:to-yellow-400 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-2xl group-hover:drop-shadow-orange-500/50 animate-gradient-shift'>
                  {siteName}
                </div>
              </div>
            </FastLink>

            {/* Enhanced Navigation Items with premium effects */}
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
                    className='group relative flex items-center gap-3 px-5 lg:px-6 py-3 rounded-2xl transition-all duration-400 hover:bg-gradient-to-r hover:from-orange-100/80 hover:via-amber-50/80 hover:to-yellow-50/80 dark:hover:from-orange-900/30 dark:hover:via-amber-900/25 dark:hover:to-yellow-900/20 whitespace-nowrap shrink-0 hover:shadow-xl hover:shadow-orange-500/15 hover:-translate-y-0.5'
                  >
                    {/* Premium active indicator with layered glow */}
                    {active && (
                      <>
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-20 rounded-2xl animate-pulse-soft`}
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-15 rounded-2xl transition-opacity duration-400`}
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-white/10 dark:from-white/10 dark:via-white/5 dark:to-white/5 rounded-2xl`}
                        />
                      </>
                    )}

                    {/* Enhanced Icon with multi-layer glow */}
                    <div className='relative'>
                      <Icon
                        className={`w-[22px] h-[22px] transition-all duration-400 ${
                          active
                            ? `${item.color} drop-shadow-xl drop-shadow-orange-500/60 scale-110`
                            : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 group-hover:scale-105 group-hover:drop-shadow-md group-hover:drop-shadow-orange-500/20'
                        }`}
                      />
                      {active && (
                        <>
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${item.gradient} blur-2xl opacity-50 rounded-full animate-pulse-soft`}
                          />
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${item.gradient} blur-xl opacity-30 rounded-full animate-pulse`}
                          />
                        </>
                      )}
                      {/* Subtle hover glow for inactive state */}
                      {!active && (
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${item.gradient} blur-xl opacity-0 rounded-full group-hover:opacity-20 group-hover:blur-lg transition-all duration-400`}
                        />
                      )}
                    </div>

                    {/* Enhanced Label with better typography */}
                    <span
                      className={`text-sm font-semibold tracking-wide transition-all duration-400 ${
                        active
                          ? `${item.color} font-extrabold drop-shadow-sm`
                          : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 group-hover:font-semibold'
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Enhanced bottom active border with animated glow */}
                    {active && (
                      <>
                        <div
                          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-gradient-to-r ${item.gradient} rounded-full shadow-xl shadow-orange-500/60 animate-pulse-soft`}
                        />
                        <div
                          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gradient-to-r ${item.gradient} blur-xl opacity-50 animate-pulse`}
                        />
                        <div
                          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-gradient-to-r ${item.gradient} blur-2xl opacity-30`}
                        />
                      </>
                    )}
                  </FastLink>
                );
              })}
            </div>

            {/* Enhanced Right Side Actions with premium styling */}
            <div className='flex items-center gap-3 shrink-0'>
              {showAIButton && onAIButtonClick && (
                <button
                  onClick={onAIButtonClick}
                  className='relative p-3 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 active:scale-95 transition-all duration-300 shadow-xl shadow-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/50 hover:-translate-y-0.5 group'
                  aria-label='AI 推荐'
                >
                  <Sparkles className='h-[22px] w-[22px] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-400' />
                  <div className='absolute inset-0 bg-gradient-to-br from-white/25 to-transparent rounded-xl' />
                  <div className='absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl blur-sm' />
                  {/* Animated ring effect */}
                  <div className='absolute inset-0 rounded-xl ring-2 ring-orange-300/50 dark:ring-orange-400/30 animate-pulse-soft' />
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

      {/* Enhanced Mobile Bottom Navigation - Premium Style */}
      <nav
        className='md:hidden fixed left-0 right-0 z-40 bg-gradient-to-t from-white/98 via-white/95 to-white/92 dark:from-gray-900/98 dark:via-gray-900/95 dark:to-gray-900/92 backdrop-blur-3xl border-t border-gradient-to-t from-orange-200/40 via-orange-100/30 to-amber-50/20 dark:from-orange-900/40 dark:via-orange-800/30 dark:to-amber-900/20 shadow-2xl shadow-orange-500/10 dark:shadow-orange-500/15 transition-all duration-500'
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className='flex items-center justify-around px-2 py-3.5'>
          {/* Enhanced first 4 items with premium effects */}
          {menuItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <FastLink
                key={item.label}
                href={item.href}
                useTransitionNav
                onClick={() => setActive(item.href)}
                className='flex flex-col items-center justify-center min-w-[64px] flex-1 py-3 px-2 transition-all duration-300 active:scale-95 group'
              >
                <div className='relative mb-2'>
                  <Icon
                    className={`w-[26px] h-[26px] transition-all duration-300 ${
                      active
                        ? `${item.color} drop-shadow-2xl drop-shadow-orange-500/60 scale-110`
                        : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-500 group-hover:scale-105 group-hover:drop-shadow-md group-hover:drop-shadow-orange-500/20'
                    }`}
                  />
                  {active && (
                    <>
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${item.gradient} blur-2xl opacity-60 rounded-full animate-pulse-soft`}
                      />
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${item.gradient} blur-xl opacity-40 rounded-full animate-pulse`}
                      />
                      <div
                        className={`absolute -inset-1.5 bg-gradient-to-br ${item.gradient} opacity-0 rounded-full animate-ping`}
                        style={{ animationDuration: '2.5s' }}
                      />
                    </>
                  )}
                  {/* Subtle hover glow for inactive state */}
                  {!active && (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${item.gradient} blur-lg opacity-0 rounded-full group-hover:opacity-20 group-hover:blur-md transition-all duration-300`}
                    />
                  )}
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-wide transition-colors duration-300 ${
                    active
                      ? `${item.color} font-extrabold drop-shadow-sm`
                      : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-500 group-hover:font-semibold'
                  }`}
                >
                  {item.label}
                </span>
              </FastLink>
            );
          })}

          {/* Enhanced More button with premium styling */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className='flex flex-col items-center justify-center min-w-[64px] flex-1 py-3 px-2 transition-all duration-300 active:scale-95 group'
          >
            <div className='relative mb-2'>
              <MoreHorizontal className='w-[26px] h-[26px] text-gray-600 dark:text-gray-400 group-hover:text-orange-500 group-hover:scale-105 group-hover:drop-shadow-md group-hover:drop-shadow-orange-500/20 transition-all duration-300' />
              {/* Subtle glow on hover */}
              <div className='absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 blur-lg opacity-0 rounded-full group-hover:opacity-20 group-hover:blur-md transition-all duration-300' />
            </div>
            <span className='text-[11px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-orange-500 group-hover:font-medium transition-colors duration-300'>
              更多
            </span>
          </button>
        </div>
      </nav>

      {/* Enhanced spacer for fixed navigation */}
      <div className='hidden md:block h-[88px]' />
      <div className='md:hidden h-[100px]' />
    </>
  );
}
