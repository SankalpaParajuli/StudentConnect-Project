import React from 'react';
import { cn } from '../../lib/utils';

const Skeleton = ({
  className,
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700 animate-pulse',
        variantClasses[variant],
        className
      )}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : undefined,
      }}
    />
  );
};

export default Skeleton;
