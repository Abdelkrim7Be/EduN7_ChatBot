import React from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...props }) => {
  let baseClass = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  if (variant === 'primary') {
    baseClass += ' bg-brand-blue text-white hover:bg-blue-600';
  } else if (variant === 'secondary') {
    baseClass += ' bg-brand-navy-light text-white hover:bg-brand-navy';
  } else if (variant === 'danger') {
    baseClass += ' bg-red-600 text-white hover:bg-red-700';
  }
  
  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
