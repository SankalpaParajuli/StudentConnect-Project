import React, { forwardRef } from 'react';
import { getInitials, getAvatarColor, cn } from '../../lib/utils';

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-lg',
};

const Avatar = forwardRef(
  ({ name = '', size = 'md', src, className }, ref) => {
    const bgColor = getAvatarColor(name);

    if (src) {
      return (
        <img
          ref={ref}
          src={src}
          alt={name}
          className={cn(
            'rounded-full object-cover',
            sizeClasses[size],
            className
          )}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center rounded-full font-semibold text-white',
          sizeClasses[size],
          className
        )}
        style={{ backgroundColor: bgColor }}
      >
        {getInitials(name)}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export default Avatar;
