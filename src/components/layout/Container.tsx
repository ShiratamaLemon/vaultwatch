import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'small' | 'large';
}

export const Container = ({
  children,
  className,
  size = 'default',
}: ContainerProps) => {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        {
          'max-w-5xl': size === 'small',
          'max-w-7xl': size === 'default',
          'max-w-screen-2xl': size === 'large',
        },
        className
      )}
    >
      {children}
    </div>
  );
};
