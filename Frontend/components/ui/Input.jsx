import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(
  (
    { label, error, icon: Icon, rightElement, className, type = 'text', ...rest },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              'w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent transition-colors duration-200',
              Icon && 'pl-10',
              rightElement && 'pr-12',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...rest}
          />
          {rightElement && (
            <div className="absolute right-0 top-0 h-full flex items-center pr-1">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
