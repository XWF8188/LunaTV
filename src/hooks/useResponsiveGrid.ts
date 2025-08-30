import { useLayoutEffect, useState, useCallback } from 'react';

interface GridDimensions {
  columnCount: number;
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
}

export const useResponsiveGrid = (
  containerRef?: React.RefObject<HTMLElement>
): GridDimensions => {
  const [dimensions, setDimensions] = useState<GridDimensions>({
    columnCount: 3,
    itemWidth: 150,
    itemHeight: 280,
    containerWidth: 450,
  });

  const calculateDimensions = useCallback((width?: number) => {
    let containerWidth: number;
    
    if (width !== undefined) {
      // ResizeObserver提供的宽度
      containerWidth = width;
    } else if (containerRef?.current?.offsetWidth) {
      // 容器已渲染，使用实际宽度
      containerWidth = containerRef.current.offsetWidth;
    } else if (typeof window !== 'undefined') {
      // 容器未准备好，使用窗口宽度减去预估padding
      containerWidth = window.innerWidth - 80;
    } else {
      // SSR或无窗口环境
      containerWidth = 450;
    }

    let columnCount: number;
    
    // 响应式列数计算
    if (containerWidth >= 1536) columnCount = 8;      // 2xl
    else if (containerWidth >= 1280) columnCount = 7;  // xl  
    else if (containerWidth >= 1024) columnCount = 6;  // lg
    else if (containerWidth >= 768) columnCount = 5;   // md
    else if (containerWidth >= 640) columnCount = 4;   // sm
    else if (containerWidth >= 475) columnCount = 3;   // xs
    else columnCount = 2;                             // mobile

    // 计算项目尺寸
    const gap = columnCount > 3 ? 32 : 8; // 大屏更大间距
    const totalGapWidth = gap * (columnCount - 1);
    const itemWidth = Math.floor((containerWidth - totalGapWidth) / columnCount);
    
    // 根据海报比例计算高度 (2:3) + 标题和来源信息高度
    const posterHeight = Math.floor(itemWidth * 1.5);
    const textHeight = 60; // 标题 + 来源信息
    const itemHeight = posterHeight + textHeight;

    setDimensions({
      columnCount,
      itemWidth,
      itemHeight,
      containerWidth,
    });
  }, [containerRef]);

  useLayoutEffect(() => {
    console.log('useResponsiveGrid effect - containerRef.current:', !!containerRef?.current);
    
    // 使用递归重试机制
    let cleanup: (() => void) | null = null;
    let retryCount = 0;
    const maxRetries = 20; // 减少到20次，200ms足够
    
    const setupObserver = () => {
      retryCount++;
      
      if (!containerRef?.current) {
        if (retryCount < maxRetries) {
          console.log(`containerRef not ready, retry ${retryCount}/${maxRetries}...`);
          setTimeout(setupObserver, 10);
        } else {
          console.log('Max retries reached, using fallback');
          calculateDimensions();
        }
        return;
      }

      const element = containerRef.current;
      
      console.log('useResponsiveGrid element info:', {
        offsetWidth: element.offsetWidth,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        getBoundingClientRect: element.getBoundingClientRect().width
      });
      
      // 如果宽度为0，延迟重试
      if (element.offsetWidth === 0) {
        if (retryCount < maxRetries) {
          console.log(`Element width is 0, retry ${retryCount}/${maxRetries}...`);
          setTimeout(setupObserver, 10);
        } else {
          console.log('Max retries reached for width, using fallback');
          calculateDimensions();
        }
        return;
      }
      
      console.log('Setting up ResizeObserver with width:', element.offsetWidth);
      calculateDimensions(element.offsetWidth);

      // 使用ResizeObserver监听尺寸变化
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          console.log('ResizeObserver triggered, width:', width);
          calculateDimensions(width);
        }
      });

      resizeObserver.observe(element);

      // 窗口resize处理
      const handleResize = () => calculateDimensions(element.offsetWidth);
      window.addEventListener('resize', handleResize);
      
      // 设置清理函数
      cleanup = () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleResize);
      };
    };
    
    // 立即开始尝试
    setupObserver();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [containerRef, calculateDimensions]);

  return dimensions;
};

export default useResponsiveGrid;