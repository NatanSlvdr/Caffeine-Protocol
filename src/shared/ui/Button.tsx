import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'text-link' | 'danger' | 'outline-danger';

/** Class-preserving button primitive; variants map to the global button classes. */
export function Button({
  variant,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const classes = [variant, className].filter(Boolean).join(' ') || undefined;
  return <button className={classes} {...rest} />;
}
