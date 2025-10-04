import React, { ButtonHTMLAttributes, useCallback } from 'react';

export interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Enable haptic feedback on supported devices
   * @default true
   */
  enableHaptic?: boolean;

  /**
   * Variant determines the button style
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'success' | 'error' | 'warning';

  /**
   * Size of the button - all sizes meet 44px minimum touch target
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Full width button
   */
  fullWidth?: boolean;
}

/**
 * TouchButton - A mobile-optimized button component with:
 * - Minimum 44x44px touch target (Apple/Google guidelines)
 * - Active state visual feedback (scale transform)
 * - Optional haptic feedback via Vibration API
 * - Prevents double-tap zoom with touch-action: manipulation
 */
export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  enableHaptic = true,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  onClick,
  disabled,
  ...props
}) => {

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback on supported devices
    if (enableHaptic && !disabled && 'vibrate' in navigator) {
      // Light tap: 10ms vibration
      navigator.vibrate(10);
    }

    // Call original onClick handler
    onClick?.(e);
  }, [enableHaptic, disabled, onClick]);

  // Base classes that apply to all buttons
  const baseClasses = 'btn transition-transform active:scale-95';

  // Variant-specific classes (DaisyUI classes)
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
    success: 'btn-success',
    error: 'btn-error',
    warning: 'btn-warning',
  }[variant];

  // Size-specific classes - all meet 44px minimum
  const sizeClasses = {
    sm: 'btn-sm min-h-[44px]',      // Even "small" buttons are touch-friendly
    md: 'btn-md min-h-[44px]',      // Default size
    lg: 'btn-lg min-h-[48px]',      // Larger touch target
  }[size];

  // Full width class
  const widthClass = fullWidth ? 'w-full' : '';

  // Combine all classes
  const buttonClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`.trim();

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled}
      // Prevent double-tap zoom on iOS
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      {...props}
    >
      {children}
    </button>
  );
};
