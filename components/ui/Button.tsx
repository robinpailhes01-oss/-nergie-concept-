'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'teal';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'teal'
        ? 'btn-teal'
        : 'btn-ghost';

  return (
    <button
      className={`btn ${variantClass} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span
          className={`spinner ${variant === 'ghost' ? 'spinner-dark' : ''}`}
        />
      )}
      {children}
    </button>
  );
}
