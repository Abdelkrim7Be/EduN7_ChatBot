import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full bg-brand-surface border border-brand-navy-border rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 ${className}`}
      {...props}
    />
  );
};
