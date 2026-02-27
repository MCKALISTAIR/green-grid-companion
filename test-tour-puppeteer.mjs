import puppeteer from 'puppeteer';
import fs from 'fs';

async function testTour() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  
  try {
    // ---- MOBILE TEST ----
    console.log('\n--- Starting Mobile Tour Test (iPhone Dimensions) ---');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true });
    
    // Inject localStorage BEFORE full render using page.evaluateOnNewDocument
    await mobilePage.evaluateOnNewDocument(() => {
        localStorage.setItem('onboarding_complete', 'true');
        localStorage.setItem('gridgreen-postcode', 'SE1 9SG');
    });
    
    await mobilePage.goto('http://localhost:8081');
    await mobilePage.waitForLoadState?.('networkidle') || await mobilePage.waitForNetworkIdle();
    
    // Check if we are actually on dashboard
    await mobilePage.waitForSelector('#bottom-nav button', { timeout: 10000 });
    
    // Navigate to Settings
    console.log('Navigating to Settings via BottomNav...');
    await mobilePage.evaluate(() => {
        const settingsBtn = Array.from(document.querySelectorAll('#bottom-nav button')).find(el => el.textContent.includes('Settings'));
        if (settingsBtn) settingsBtn.click();
    });
    
    // Click Reset App Guide
    console.log('Clicking "Reset App Guide"...');
    await mobilePage.waitForFunction(() => {
        return Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Reset App Guide'));
    }, { timeout: 10000 });
    await mobilePage.evaluate(() => {
        const resetBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Reset App Guide'));
        if (resetBtn) resetBtn.click();
    });
    
    // Wait for the Tour Popover
    await mobilePage.waitForSelector('.driver-popover', { timeout: 15000 });
    const mobileTitle = await mobilePage.$eval('.driver-popover-title', el => el.textContent);
    console.log(`✅ Mobile Tour Started! First step: ${mobileTitle}`);
    
    // ---- DESKTOP TEST ----
    console.log('\n--- Starting Desktop Tour Test ---');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 800 });
    
    await desktopPage.evaluateOnNewDocument(() => {
        localStorage.setItem('onboarding_complete', 'true');
        localStorage.setItem('gridgreen-postcode', 'SE1 9SG');
    });
    
    await desktopPage.goto('http://localhost:8081');
    await desktopPage.waitForLoadState?.('networkidle') || await desktopPage.waitForNetworkIdle();
    
    // Navigate to Settings
    console.log('Navigating to Settings via SideNav...');
    await desktopPage.waitForSelector('#side-nav button', { timeout: 10000 });
    await desktopPage.evaluate(() => {
        const settingsBtn = Array.from(document.querySelectorAll('#side-nav button')).find(el => el.textContent.includes('Settings'));
        if (settingsBtn) settingsBtn.click();
    });
    
    // Click Reset App Guide
    console.log('Clicking "Reset App Guide"...');
    await desktopPage.waitForFunction(() => {
        return Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Reset App Guide'));
    }, { timeout: 10000 });
    await desktopPage.evaluate(() => {
        const resetBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Reset App Guide'));
        if (resetBtn) resetBtn.click();
    });
    
    await desktopPage.waitForSelector('.driver-popover', { timeout: 15000 });
    const desktopTitle = await desktopPage.$eval('.driver-popover-title', el => el.textContent);
    console.log(`✅ Desktop Tour Started! First step: ${desktopTitle}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\nClosing browser...');
    await browser.close();
  }
}

testTour();
