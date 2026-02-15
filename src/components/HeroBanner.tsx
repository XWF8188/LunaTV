/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { useAutoplay } from './hooks/useAutoplay';
import { useSwipeGesture } from './hooks/useSwipeGesture';

interface BannerItem {
  id: string | number;
  title: string;
  description?: string;
  poster: string;
  backdrop?: string;
  year?: string;
  rate?: string;
  douban_id?: number;
  type?: string;
  trailerUrl?: string;
}

interface HeroBannerProps {
  items: BannerItem[];
  autoPlayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  enableVideo?: boolean;
}

function HeroBanner({
  items,
  autoPlayInterval = 8000,
  showControls = true,
  showIndicators = true,
  enableVideo = false,
}: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [refreshedTrailerUrls, setRefreshedTrailerUrls] = useState<
    Record<string, string>
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('refreshed-trailer-urls');
        return stored ? JSON.parse(stored) : {};
      } catch (error) {
        console.error('[HeroBanner] 读取localStorage失败:', error);
        return {};
      }
    }
    return {};
  });

  const getProxiedImageUrl = (url: string) => {
    if (url?.includes('douban') || url?.includes('doubanio')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const getHDBackdrop = (url?: string) => {
    if (!url) return url;
    return url
      .replace('/view/photo/s/', '/view/photo/l/')
      .replace('/view/photo/m/', '/view/photo/l/')
      .replace('/view/photo/sqxs/', '/view/photo/l/')
      .replace('/s_ratio_poster/', '/l_ratio_poster/')
      .replace('/m_ratio_poster/', '/l_ratio_poster/');
  };

  const getProxiedVideoUrl = (url: string) => {
    if (url?.includes('douban') || url?.includes('doubanio')) {
      return `/api/video-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const refreshTrailerUrl = useCallback(async (doubanId: number | string) => {
    try {
      console.log('[HeroBanner] 检测到trailer URL过期，重新获取:', doubanId);

      const response = await fetch(
        `/api/douban/refresh-trailer?id=${doubanId}`,
      );

      if (!response.ok) {
        console.error('[HeroBanner] 刷新trailer URL失败:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.code === 200 && data.data?.trailerUrl) {
        console.log('[HeroBanner] 成功获取新的trailer URL');

        setRefreshedTrailerUrls((prev) => {
          const updated = {
            ...prev,
            [doubanId]: data.data.trailerUrl,
          };

          try {
            localStorage.setItem(
              'refreshed-trailer-urls',
              JSON.stringify(updated),
            );
          } catch (error) {
            console.error('[HeroBanner] 保存到localStorage失败:', error);
          }

          return updated;
        });

        return data.data.trailerUrl;
      } else {
        console.warn('[HeroBanner] 未能获取新的trailer URL:', data.message);
      }
    } catch (error) {
      console.error('[HeroBanner] 刷新trailer URL异常:', error);
    }
    return null;
  }, []);

  const getEffectiveTrailerUrl = (item: BannerItem) => {
    if (item.douban_id && refreshedTrailerUrls[item.douban_id]) {
      return refreshedTrailerUrls[item.douban_id];
    }
    return item.trailerUrl;
  };

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setVideoLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsTransitioning(false), 800);
  }, [isTransitioning, items.length]);

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setVideoLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsTransitioning(false), 800);
  }, [isTransitioning, items.length]);

  const handleIndicatorClick = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setVideoLoaded(false);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useAutoplay({
    currentIndex,
    isHovered,
    autoPlayInterval,
    itemsLength: items.length,
    onNext: handleNext,
  });

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  useEffect(() => {
    const indicesToPreload = [
      currentIndex,
      (currentIndex - 1 + items.length) % items.length,
      (currentIndex + 1) % items.length,
    ];

    indicesToPreload.forEach((index) => {
      const item = items[index];
      if (item) {
        const img = new window.Image();
        const imageUrl = getHDBackdrop(item.backdrop) || item.poster;
        img.src = getProxiedImageUrl(imageUrl);
      }
    });
  }, [items, currentIndex]);

  if (!items || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];
  const backgroundImage =
    getHDBackdrop(currentItem.backdrop) || currentItem.poster;

  useEffect(() => {
    const checkAndRefreshMissingTrailers = async () => {
      for (const item of items) {
        if (
          item.douban_id &&
          !item.trailerUrl &&
          !refreshedTrailerUrls[item.douban_id]
        ) {
          console.log(
            '[HeroBanner] 检测到缺失的 trailer，尝试获取:',
            item.title,
          );
          await refreshTrailerUrl(item.douban_id);
        }
      }
    };

    const timer = setTimeout(checkAndRefreshMissingTrailers, 1000);
    return () => clearTimeout(timer);
  }, [items, refreshedTrailerUrls, refreshTrailerUrl]);

  return (
    <div
      className='relative w-full h-screen overflow-hidden group card-container'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...swipeHandlers}
    >
      <div className='absolute inset-0'>
        {items.map((item, index) => {
          const prevIndex = (currentIndex - 1 + items.length) % items.length;
          const nextIndex = (currentIndex + 1) % items.length;
          const shouldRender =
            index === currentIndex ||
            index === prevIndex ||
            index === nextIndex;

          if (!shouldRender) return null;

          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div
                className={`absolute inset-0 transition-transform duration-[10s] ease-in-out ${
                  index === currentIndex ? 'scale-105' : 'scale-100'
                }`}
              >
                <Image
                  src={getProxiedImageUrl(
                    getHDBackdrop(item.backdrop) || item.poster,
                  )}
                  alt={item.title}
                  fill
                  className='object-cover object-center'
                  priority={index === 0}
                  quality={100}
                  sizes='100vw'
                  unoptimized={
                    item.backdrop?.includes('/l/') ||
                    item.backdrop?.includes('/l_ratio_poster/') ||
                    false
                  }
                />
              </div>

              {enableVideo &&
                getEffectiveTrailerUrl(item) &&
                index === currentIndex && (
                  <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                      videoLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    autoPlay
                    muted={isMuted}
                    loop
                    playsInline
                    preload='metadata'
                    onError={async (e) => {
                      const video = e.currentTarget;
                      console.error('[HeroBanner] 视频加载失败:', {
                        title: item.title,
                        trailerUrl: item.trailerUrl,
                        error: e,
                      });

                      if (item.douban_id) {
                        if (refreshedTrailerUrls[item.douban_id]) {
                          console.log(
                            '[HeroBanner] localStorage中的URL也过期了，清除并重新获取',
                          );

                          setRefreshedTrailerUrls((prev) => {
                            const updated = { ...prev };
                            delete updated[item.douban_id];

                            try {
                              localStorage.setItem(
                                'refreshed-trailer-urls',
                                JSON.stringify(updated),
                              );
                            } catch (error) {
                              console.error(
                                '[HeroBanner] 清除localStorage失败:',
                                error,
                              );
                            }

                            return updated;
                          });
                        }

                        const newUrl = await refreshTrailerUrl(item.douban_id);
                        if (newUrl) {
                          video.load();
                        }
                      }
                    }}
                    onLoadedData={(e) => {
                      console.log('[HeroBanner] 视频加载成功:', item.title);
                      setVideoLoaded(true);
                      const video = e.currentTarget;
                      video.play().catch((error) => {
                        console.error('[HeroBanner] 视频自动播放失败:', error);
                      });
                    }}
                  >
                    <source
                      src={getProxiedVideoUrl(
                        getEffectiveTrailerUrl(item) || '',
                      )}
                      type='video/mp4'
                    />
                  </video>
                )}
            </div>
          );
        })}

        <div className='absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60' />

        <div className='absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80' />

        <div className='absolute inset-0 bg-gradient-to-b from-gray-950/30 via-transparent to-transparent' />
      </div>

      <div className='absolute bottom-0 left-0 right-0 px-6 sm:px-12 md:px-20 lg:px-32 pb-16 sm:pb-20 md:pb-24 lg:pb-32'>
        <div className='space-y-6 sm:space-y-8 md:space-y-10 max-w-5xl'>
          <div className='flex items-center gap-2 mb-2'>
            <Sparkles className='w-5 h-5 text-violet-400 animate-pulse' />
            <span className='text-violet-400 text-sm font-medium tracking-wider uppercase'>
              精选推荐
            </span>
          </div>

          <h1 className='text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white drop-shadow-2xl leading-tight break-words animate-slide-in-up'>
            {currentItem.title}
          </h1>

          <div className='flex items-center gap-4 sm:gap-5 text-base sm:text-lg md:text-xl flex-wrap animate-slide-in-up animate-delay-100'>
            {currentItem.rate && (
              <div className='flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl font-semibold text-white/90'>
                <span className='text-amber-400 text-lg'>★</span>
                <span className='text-lg'>{currentItem.rate}</span>
              </div>
            )}
            {currentItem.year && (
              <span className='text-white/80 font-medium text-lg'>
                {currentItem.year}
              </span>
            )}
            {currentItem.type && (
              <span className='px-4 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-white/80 font-medium'>
                {currentItem.type === 'movie'
                  ? '电影'
                  : currentItem.type === 'tv'
                    ? '剧集'
                    : currentItem.type === 'variety'
                      ? '综艺'
                      : currentItem.type === 'shortdrama'
                        ? '短剧'
                        : currentItem.type === 'anime'
                          ? '动漫'
                          : '剧集'}
              </span>
            )}
          </div>

          <div className='flex gap-4 sm:gap-5 pt-3 animate-slide-in-up animate-delay-200'>
            <Link
              href={
                currentItem.type === 'shortdrama'
                  ? `/play?title=${encodeURIComponent(currentItem.title)}&shortdrama_id=${currentItem.id}`
                  : `/play?title=${encodeURIComponent(currentItem.title)}${currentItem.year ? `&year=${currentItem.year}` : ''}${currentItem.douban_id ? `&douban_id=${currentItem.douban_id}` : ''}${currentItem.type ? `&stype=${currentItem.type}` : ''}`
              }
              className='relative flex items-center gap-3 px-8 sm:px-10 md:px-12 py-4 sm:py-4.5 md:py-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-2xl hover:from-violet-500 hover:to-purple-500 transition-all transform hover:scale-105 active:scale-95 shadow-2xl shadow-violet-600/40 text-base sm:text-lg md:text-xl group overflow-hidden'
            >
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700' />
              <Play
                className='w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 relative z-10'
                fill='currentColor'
              />
              <span className='relative z-10'>播放</span>
            </Link>
            <Link
              href={
                currentItem.type === 'shortdrama'
                  ? '/shortdrama'
                  : `/douban?type=${
                      currentItem.type === 'variety'
                        ? 'show'
                        : currentItem.type || 'movie'
                    }`
              }
              className='relative flex items-center gap-3 px-8 sm:px-10 md:px-12 py-4 sm:py-4.5 md:py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all hover:scale-105 active:scale-95 text-sm sm:text-base md:text-lg group overflow-hidden'
            >
              <div className='absolute inset-0 border-2 border-transparent rounded-2xl group-hover:border-violet-500/50 transition-all duration-300' />
              <Info className='w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 relative z-10' />
              <span className='relative z-10'>加入片单</span>
            </Link>
          </div>
        </div>
      </div>

      {enableVideo && getEffectiveTrailerUrl(currentItem) && (
        <button
          onClick={toggleMute}
          className='absolute bottom-20 sm:bottom-24 right-6 sm:right-10 md:right-14 lg:right-20 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-all border border-white/20 z-10'
          aria-label={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? (
            <VolumeX className='w-6 h-6 sm:w-7 sm:h-7' />
          ) : (
            <Volume2 className='w-6 h-6 sm:w-7 sm:h-7' />
          )}
        </button>
      )}

      {showControls && items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className='hidden md:flex absolute left-6 lg:left-12 top-1/2 -translate-y-1/2 w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-black/40 backdrop-blur-md text-white items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all transform hover:scale-110 border border-white/10'
            aria-label='上一张'
          >
            <ChevronLeft className='w-7 h-7 lg:w-8 lg:h-8' />
          </button>
          <button
            onClick={handleNext}
            className='hidden md:flex absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-black/40 backdrop-blur-md text-white items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all transform hover:scale-110 border border-white/10'
            aria-label='下一张'
          >
            <ChevronRight className='w-7 h-7 lg:w-8 lg:h-8' />
          </button>
        </>
      )}

      {showIndicators && items.length > 1 && (
        <div className='absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2'>
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => handleIndicatorClick(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 sm:w-10 bg-white shadow-lg'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
        </div>
      )}

      <div className='absolute top-6 sm:top-8 md:top-10 right-6 sm:right-10 md:right-14'>
        <div className='px-3 py-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg text-white/70 text-sm font-medium'>
          {currentIndex + 1} / {items.length}
        </div>
      </div>
    </div>
  );
}

export default memo(HeroBanner);
