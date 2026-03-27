import React from 'react';
import { cn } from '../../lib/utils';

const variantClasses = {
  default: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  accent: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs font-medium',
  md: 'px-3 py-1.5 text-sm font-medium',
};

const Badge = ({ children, variant = 'default', size = 'md', className }) => {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
