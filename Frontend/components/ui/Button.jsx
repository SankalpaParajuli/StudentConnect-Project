import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const variantClasses = {
  primary:
    'bg-[#4F7C82] hover:bg-[#0B2E33] text-white dark:bg-[#4F7C82] dark:hover:bg-[#0B2E33] focus:ring-2 focus:ring-[#4F7C82] focus:ring-offset-2 dark:focus:ring-offset-gray-900',
  secondary:
    'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-gray-400',
  danger:
    'bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
  success:
    'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
  ghost:
    'bg-transparent hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600',
  outline:
    'border-2 border-[#4F7C82] bg-transparent text-[#4F7C82] hover:bg-[#4F7C82] hover:text-white dark:border-[#4F7C82] dark:hover:bg-[#4F7C82] focus:ring-2 focus:ring-[#4F7C82] focus:ring-offset-2 dark:focus:ring-offset-gray-900',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...rest}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
