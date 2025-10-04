import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TouchButton } from '../common/TouchButton';

describe('TouchButton Component', () => {
  describe('Touch Target Size (Apple/Google Guidelines)', () => {
    test('small button has minimum 44px height', () => {
      const { container } = render(
        <TouchButton size="sm">Small Button</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('min-h-[44px]');
    });

    test('medium button has minimum 44px height', () => {
      const { container } = render(
        <TouchButton size="md">Medium Button</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('min-h-[44px]');
    });

    test('large button has minimum 48px height', () => {
      const { container } = render(
        <TouchButton size="lg">Large Button</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('min-h-[48px]');
    });

    test('default button (no size prop) has minimum 44px height', () => {
      const { container } = render(
        <TouchButton>Default Button</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('min-h-[44px]');
    });
  });

  describe('Visual Feedback', () => {
    test('has active state scale transform', () => {
      const { container } = render(
        <TouchButton>Press Me</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('active:scale-95');
    });

    test('has smooth transition', () => {
      const { container } = render(
        <TouchButton>Press Me</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('transition-transform');
    });
  });

  describe('Touch Optimization', () => {
    test('prevents double-tap zoom with touch-action', () => {
      const { container } = render(
        <TouchButton>Touch Me</TouchButton>
      );

      const button = container.querySelector('button');
      const style = window.getComputedStyle(button!);

      // Check inline style (which takes precedence)
      expect(button?.style.touchAction).toBe('manipulation');
    });

    test('removes tap highlight on WebKit', () => {
      const { container } = render(
        <TouchButton>Touch Me</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.style.WebkitTapHighlightColor).toBe('transparent');
    });
  });

  describe('Haptic Feedback', () => {
    let vibrateSpy: jest.SpyInstance;

    beforeEach(() => {
      vibrateSpy = jest.spyOn(navigator, 'vibrate').mockImplementation(() => true);
    });

    afterEach(() => {
      vibrateSpy.mockRestore();
    });

    test('triggers haptic feedback on click when enabled', () => {
      const { getByText } = render(
        <TouchButton enableHaptic={true}>Vibrate</TouchButton>
      );

      fireEvent.click(getByText('Vibrate'));
      expect(vibrateSpy).toHaveBeenCalledWith(10);
    });

    test('does not trigger haptic when disabled', () => {
      const { getByText } = render(
        <TouchButton enableHaptic={false}>No Vibrate</TouchButton>
      );

      fireEvent.click(getByText('No Vibrate'));
      expect(vibrateSpy).not.toHaveBeenCalled();
    });

    test('does not trigger haptic when button is disabled', () => {
      const { getByText } = render(
        <TouchButton enableHaptic={true} disabled>Disabled</TouchButton>
      );

      fireEvent.click(getByText('Disabled'));
      expect(vibrateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Button Variants', () => {
    test('renders primary variant', () => {
      const { container } = render(
        <TouchButton variant="primary">Primary</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('btn-primary');
    });

    test('renders secondary variant', () => {
      const { container } = render(
        <TouchButton variant="secondary">Secondary</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('btn-secondary');
    });

    test('renders ghost variant', () => {
      const { container } = render(
        <TouchButton variant="ghost">Ghost</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('btn-ghost');
    });

    test('renders outline variant', () => {
      const { container } = render(
        <TouchButton variant="outline">Outline</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('btn-outline');
    });
  });

  describe('Full Width', () => {
    test('renders full width when specified', () => {
      const { container } = render(
        <TouchButton fullWidth>Full Width</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('w-full');
    });

    test('does not render full width by default', () => {
      const { container } = render(
        <TouchButton>Not Full Width</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).not.toContain('w-full');
    });
  });

  describe('Click Handler', () => {
    test('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      const { getByText } = render(
        <TouchButton onClick={handleClick}>Click Me</TouchButton>
      );

      fireEvent.click(getByText('Click Me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      const { getByText } = render(
        <TouchButton onClick={handleClick} disabled>Disabled</TouchButton>
      );

      fireEvent.click(getByText('Disabled'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom Classes', () => {
    test('accepts custom className', () => {
      const { container } = render(
        <TouchButton className="custom-class">Custom</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('custom-class');
    });

    test('preserves base classes with custom className', () => {
      const { container } = render(
        <TouchButton className="custom-class">Custom</TouchButton>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('btn');
      expect(button?.className).toContain('custom-class');
    });
  });
});
