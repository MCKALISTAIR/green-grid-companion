import { chromium, devices } from 'playwright';

async function testTour() {
  console.log('Starting Mobile Tour Test...');
  const browser = await chromium.launch();
  
  // Mobile context (iPhone 13)
  const mobileContext = await browser.newContext(devices['iPhone 13']);
  const mobilePage = await mobileContext.newPage();
  
  try {
    await mobilePage.goto('http://localhost:8081');
    await mobilePage.waitForLoadState('networkidle');
    
    // Set localStorage to trigger tour via replay in settings later
    await mobilePage.evaluate(() => {
        localStorage.setItem('onboarding_complete', 'true');
    });
    
    // Go to Settings via bottom nav
    console.log('Clicking Settings in BottomNav...');
    await mobilePage.click('#bottom-nav button:has-text("Settings")');
    await mobilePage.waitForLoadState('networkidle');
    
    // Click Reset App Guide
    console.log('Clicking Reset App Guide...');
    await mobilePage.click('button:has-text("Reset App Guide")');
    
    // Wait for the tour to start
    await mobilePage.waitForSelector('.driver-popover', { state: 'visible', timeout: 5000 });
    console.log('✅ Mobile Tour Started Successfully');
    
    // Check first step
    const title1 = await mobilePage.innerText('.driver-popover-title');
    console.log(`Step 1 Title: ${title1}`);
    
    if (title1.includes('Live Carbon Intensity')) {
        console.log('✅ First step targeted correctly');
    } else {
        console.error('❌ First step incorrect');
    }

  } catch (e) {
    console.error('Mobile test failed:', e);
  } finally {
    await mobileContext.close();
  }

  console.log('\nStarting Desktop Tour Test...');
  // Desktop Context
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopContext.newPage();
  
  try {
    await desktopPage.goto('http://localhost:8081');
    await desktopPage.waitForLoadState('networkidle');
    
    await desktopPage.evaluate(() => {
        localStorage.setItem('onboarding_complete', 'true');
    });
    
    console.log('Clicking Settings in SideNav...');
    await desktopPage.click('#side-nav button:has-text("Settings")');
    await desktopPage.waitForLoadState('networkidle');
    
    console.log('Clicking Reset App Guide...');
    await desktopPage.click('button:has-text("Reset App Guide")');
    
    await desktopPage.waitForSelector('.driver-popover', { state: 'visible', timeout: 5000 });
    console.log('✅ Desktop Tour Started Successfully');
    
  } catch (e) {
    console.error('Desktop test failed:', e);
  } finally {
    await desktopContext.close();
    await browser.close();
  }
}

testTour();
