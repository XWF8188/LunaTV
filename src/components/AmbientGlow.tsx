'use client';

import { memo } from 'react';

interface AmbientGlowProps {
  color?: string;
  intensity?: number;
  blur?: number;
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';
}

function AmbientGlow({
  color = 'rgba(139, 92, 246, 0.1)',
  intensity = 1,
  blur = 150,
  position = 'center',
}: AmbientGlowProps) {
  const getPositionStyles = () => {
    const positions = {
      'top-left': 'top-0 left-0',
      'top-right': 'top-0 right-0',
      'bottom-left': 'bottom-0 left-0',
      'bottom-right': 'bottom-0 right-0',
      center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    };
    return positions[position];
  };

  return (
    <div
      className={`absolute pointer-events-none ${getPositionStyles()}`}
      style={{
        width: `${600 * intensity}px`,
        height: `${600 * intensity}px`,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        opacity: 0.6,
      }}
    />
  );
}

export default memo(AmbientGlow);
