import { test, expect } from '@playwright/test';

test.describe('Wallet Modal Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
  });

  test('modal positioning and accessibility', async ({ page }) => {
    // Click connect wallet button
    await page.click('text=Connect Wallet');
    
    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Check if modal is visible and properly positioned
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Get modal bounding box
    const modalBox = await modal.boundingBox();
    expect(modalBox).toBeTruthy();
    
    // Get viewport size
    const viewportSize = page.viewportSize();
    expect(viewportSize).toBeTruthy();
    
    if (modalBox && viewportSize) {
      // Check if modal is centered horizontally
      const modalCenterX = modalBox.x + modalBox.width / 2;
      const viewportCenterX = viewportSize.width / 2;
      expect(Math.abs(modalCenterX - viewportCenterX)).toBeLessThan(50);
      
      // Check if modal is properly positioned vertically (not cut off)
      expect(modalBox.y).toBeGreaterThan(0);
      expect(modalBox.y + modalBox.height).toBeLessThan(viewportSize.height);
      
      // Check if modal is fully visible
      expect(modalBox.x).toBeGreaterThan(0);
      expect(modalBox.x + modalBox.width).toBeLessThan(viewportSize.width);
    }
    
    // Check z-index by ensuring modal is above other elements
    const zIndex = await modal.evaluate((el) => window.getComputedStyle(el).zIndex);
    expect(parseInt(zIndex)).toBeGreaterThan(1000);
    
    // Test modal can be closed by clicking backdrop
    await page.click('[role="dialog"]', { position: { x: 10, y: 10 } });
    await expect(modal).toBeHidden();
  });

  test('modal content accessibility', async ({ page }) => {
    // Click connect wallet button
    await page.click('text=Connect Wallet');
    
    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Check if modal has proper ARIA attributes
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'wallet-modal-title');
    
    // Check if title is visible and readable
    const title = page.locator('#wallet-modal-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Select Wallet');
    
    // Check if close button is accessible
    const closeButton = page.locator('[aria-label="Close modal"]');
    await expect(closeButton).toBeVisible();
    
    // Test close button functionality
    await closeButton.click();
    await expect(modal).toBeHidden();
  });

  test('wallet selection functionality', async ({ page }) => {
    // Click connect wallet button
    await page.click('text=Connect Wallet');
    
    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Check if wallet options are visible
    const phantomWallet = page.locator('text=Phantom');
    const solflareWallet = page.locator('text=Solflare');
    
    await expect(phantomWallet).toBeVisible();
    await expect(solflareWallet).toBeVisible();
    
    // Check if wallet buttons are clickable
    const walletButtons = page.locator('button:has-text("Phantom"), button:has-text("Solflare")');
    const buttonCount = await walletButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('responsive modal behavior', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Click connect wallet button
    await page.click('text=Connect Wallet');
    
    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Check if modal fits in mobile viewport
    const modalBox = await modal.boundingBox();
    expect(modalBox).toBeTruthy();
    
    if (modalBox) {
      expect(modalBox.x).toBeGreaterThanOrEqual(0);
      expect(modalBox.y).toBeGreaterThanOrEqual(0);
      expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(375);
      expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(667);
    }
    
    // Test on tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Modal should still be visible and properly positioned
    await expect(modal).toBeVisible();
  });

  test('escape key closes modal', async ({ page }) => {
    // Click connect wallet button
    await page.click('text=Connect Wallet');
    
    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Press escape key
    await page.keyboard.press('Escape');
    
    // Modal should be closed
    await expect(modal).toBeHidden();
  });
});