'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Children,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface FloatingContentLayerProps {
  children: React.ReactNode;
  scrollDistance?: number;
  title?: string;
  subtitle?: string;
}

function FloatingContentLayer({
  children,
  scrollDistance = 1000,
  title,
  subtitle,
}: FloatingContentLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const checkScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isVisible, setIsVisible] = useState(false);

  const childrenCount = useMemo(() => Children.count(children), [children]);

  const checkScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = containerRef.current;
      const threshold = 1;
      const canScrollRight =
        scrollWidth - (scrollLeft + clientWidth) > threshold;
      const canScrollLeft = scrollLeft > threshold;

      setShowRightScroll((prev) =>
        prev !== canScrollRight ? canScrollRight : prev,
      );
      setShowLeftScroll((prev) =>
        prev !== canScrollLeft ? canScrollLeft : prev,
      );
    }
  }, []);

  const scrollLeft = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: -scrollDistance,
        behavior: 'smooth',
      });
    }
  }, [scrollDistance]);

  const scrollRight = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: scrollDistance,
        behavior: 'smooth',
      });
    }
  }, [scrollDistance]);

  useEffect(() => {
    if (checkScrollTimeoutRef.current) {
      clearTimeout(checkScrollTimeoutRef.current);
    }
    checkScrollTimeoutRef.current = setTimeout(checkScroll, 100);
    return () => {
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
      }
    };
  }, [checkScroll, childrenCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`relative w-full py-16 transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <div className='max-w-[1600px] mx-auto px-6 sm:px-12 md:px-16 lg:px-20'>
        {(title || subtitle) && (
          <div className='mb-8 space-y-2'>
            {title && (
              <h2 className='text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight'>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className='text-lg sm:text-xl text-white/60 font-light'>
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className='relative'
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className='flex gap-6 overflow-x-auto pb-8'
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

            {children}
          </div>

          {showLeftScroll && (
            <button
              onClick={scrollLeft}
              className='hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-14 h-14 bg-gradient-to-r from-gray-950 to-transparent items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:translate-x-0 z-10'
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {showRightScroll && (
            <button
              onClick={scrollRight}
              className='hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-14 h-14 bg-gradient-to-l from-gray-950 to-transparent items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:translate-x-0 z-10'
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(FloatingContentLayer);
