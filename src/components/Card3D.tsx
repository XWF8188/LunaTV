'use client';

import { memo, useEffect, useRef, useState } from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

function Card3D({ children, className = '', intensity = 15 }: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * intensity;
      const rotateY = ((centerX - x) / centerX) * intensity;

      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;

      setTransform(
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
      );
      setGlowPosition({ x: glareX, y: glareY });
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setTransform(
        'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      );
      setGlowPosition({ x: 50, y: 50 });
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      card.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [intensity]);

  return (
    <div
      ref={cardRef}
      className={`relative transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={{
        transform,
      }}
    >
      <div
        className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `radial-gradient(
            circle at ${glowPosition.x}% ${glowPosition.y}%,
            rgba(139, 92, 246, 0.15) 0%,
            transparent 50%
          )`,
          pointerEvents: 'none',
        }}
      />

      <div
        className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `radial-gradient(
            circle at ${100 - glowPosition.x}% ${100 - glowPosition.y}%,
            rgba(255, 255, 255, 0.05) 0%,
            transparent 50%
          )`,
          pointerEvents: 'none',
        }}
      />

      <div className='relative h-full'>{children}</div>
    </div>
  );
}

export default memo(Card3D);
