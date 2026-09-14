import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface AnimatedCounterProps {
  value: number | undefined | null;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  duration = 0.8,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) return '--';
    return `${prefix}${value.toFixed(decimals)}${suffix}`;
  });

  const valueRef = useRef<{ val: number }>({
    val: typeof value === 'number' && !isNaN(value) ? value : 0,
  });

  useEffect(() => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
      setDisplayValue('--');
      return;
    }

    gsap.killTweensOf(valueRef.current);
    gsap.to(valueRef.current, {
      val: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        const currentVal = typeof valueRef.current?.val === 'number' && !isNaN(valueRef.current.val) ? valueRef.current.val : 0;
        setDisplayValue(`${prefix}${currentVal.toFixed(decimals)}${suffix}`);
      },
    });
  }, [value, decimals, prefix, suffix, duration]);

  return <span className={className}>{displayValue}</span>;
};
