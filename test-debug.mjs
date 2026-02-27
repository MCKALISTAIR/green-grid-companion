import puppeteer from 'puppeteer';
import fs from 'fs';

async function testDebug() {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true });
    await mobilePage.goto('http://localhost:8081');
    
    // Bypass onboarding
    while(true) {
        try {
            await mobilePage.waitForSelector('button:not([disabled])', { timeout: 2000 });
            const btnText = await mobilePage.evaluate(() => {
                const getStartedBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Get Started'));
                const nextBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Next'));
                const skipBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Skip'));
                const btn = getStartedBtn || nextBtn || skipBtn;
                if (btn) {
                    btn.click();
                    return btn.textContent;
                }
                return null;
            });
            if (!btnText) break;
            await mobilePage.waitForTimeout(500);
        } catch(e) {
            break;
        }
    }

    await mobilePage.evaluate(() => localStorage.setItem('onboarding_complete', 'true'));
    await mobilePage.reload({ waitUntil: 'networkidle0' });
    
    // Dump actual DOM for exactly what is visible
    const dom = await mobilePage.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('mobile-dom-dump.html', dom);
    console.log("DOM dumped to mobile-dom-dump.html");

    await mobilePage.screenshot({ path: 'mobile-debug.png' });
    console.log("Screenshot saved.");
  } finally {
    await browser.close();
  }
}
testDebug();
