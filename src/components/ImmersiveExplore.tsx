'use client';

import { memo, useEffect, useRef, useState } from 'react';

interface ImmersiveExploreProps {
  title?: string;
  children: React.ReactNode;
}

function ImmersiveExplore({
  title = '探索宇宙',
  children,
}: ImmersiveExploreProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`relative w-full py-24 transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
      }`}
    >
      <div className='absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/50 to-gray-950' />

      <div className='relative z-10 max-w-[1600px] mx-auto px-6 sm:px-12 md:px-16 lg:px-20'>
        <div className='text-center mb-16 space-y-4'>
          <h2 className='text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight'>
            {title}
          </h2>
          <p className='text-xl sm:text-2xl text-white/60 font-light'>
            发现更多精彩内容
          </p>
        </div>

        <div className='relative'>
          <div className='absolute inset-0 bg-gradient-to-r from-violet-900/20 via-purple-900/20 to-violet-900/20 blur-3xl' />
          <div className='relative'>{children}</div>
        </div>
      </div>
    </section>
  );
}

export default memo(ImmersiveExplore);
