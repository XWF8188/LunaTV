'use client';

import {
  Home,
  Search,
  Globe,
  Film,
  Tv,
  PlaySquare,
  Cat,
  Clover,
  Radio,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';

interface NavItem {
  icon: any;
  label: string;
  href: string;
  activeGradient: string;
}

const navItems: NavItem[] = [
  {
    icon: Home,
    label: '首页',
    href: '/',
    activeGradient: 'bg-gradient-to-r from-orange-600 to-amber-600',
  },
  {
    icon: Search,
    label: '搜索',
    href: '/search',
    activeGradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
  },
  {
    icon: Globe,
    label: '源浏览',
    href: '/source-browser',
    activeGradient: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  },
  {
    icon: Film,
    label: '电影',
    href: '/douban?type=movie',
    activeGradient: 'bg-gradient-to-r from-pink-500 to-rose-500',
  },
  {
    icon: Tv,
    label: '剧集',
    href: '/douban?type=tv',
    activeGradient: 'bg-gradient-to-r from-orange-500 to-red-500',
  },
  {
    icon: PlaySquare,
    label: '短剧',
    href: '/shortdrama',
    activeGradient: 'bg-gradient-to-r from-orange-500 to-red-500',
  },
  {
    icon: Cat,
    label: '动漫',
    href: '/douban?type=anime',
    activeGradient: 'bg-gradient-to-r from-orange-500 to-amber-500',
  },
  {
    icon: Clover,
    label: '综艺',
    href: '/douban?type=show',
    activeGradient: 'bg-gradient-to-r from-amber-400 to-orange-400',
  },
  {
    icon: Radio,
    label: '直播',
    href: '/live',
    activeGradient: 'bg-gradient-to-r from-red-500 to-pink-500',
  },
];

export default function SideNavigation() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = useCallback(
    (href: string) => {
      const typeMatch = href.match(/type=([^&]+)/)?.[1];
      const decodedActive = decodeURIComponent(pathname);
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
    [pathname],
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsCollapsed(scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        ref={containerRef}
        className={`fixed left-6 top-1/2 -translate-y-1/2 z-1000 transition-all duration-500 ease-out ${
          isCollapsed ? 'w-14' : 'w-16'
        } bg-black/70 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-black/50`}
      >
        <div className='flex flex-col items-center py-6 gap-2'>
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 ${
                  active
                    ? `${item.activeGradient} text-white shadow-lg shadow-violet-500/30 scale-110`
                    : 'text-white/50 hover:text-white hover:bg-white/10 hover:scale-105'
                }`}
              >
                {active && (
                  <div
                    className={`absolute -left-1 w-1 h-8 rounded-full ${item.activeGradient.replace('bg-gradient-to-r from-', 'bg-gradient-to-b from-').split(' ')[0]} opacity-60`}
                  />
                )}
                <Icon className='w-5 h-5' />
                {active && (
                  <div
                    className={`absolute -right-2 w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse`}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className='fixed left-6 bottom-6 z-1000'>
        <div
          className={`flex flex-col items-center gap-2 transition-all duration-500 ease-out ${
            isCollapsed ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
          }`}
        >
          <div className='w-10 h-10 rounded-full bg-orange-600/20 backdrop-blur-xl flex items-center justify-center text-orange-400 border border-orange-500/30 hover:scale-110 transition-transform cursor-pointer'>
            <Sparkles className='w-5 h-5' />
          </div>
        </div>
      </div>
    </>
  );
}
