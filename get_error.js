import puppeteer from 'puppeteer';

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
      console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
    });
    page.on('pageerror', error => console.log('PAGE EXCEPTION:', error.message, error.stack));
    
    console.log('Navigating to app...');
    await page.goto('http://localhost:5173/');
    
    console.log('Waiting for network idle...');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved to screenshot.png');
    
    console.log('Clicking a link...');
    // find the link by href
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const target = links.find(l => l.href.includes('/archive'));
      if (target) target.click();
      else console.log('Link not found!');
    });
    
    console.log('Waiting after click...');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({ path: 'screenshot_after.png' });
    
    console.log('Closing browser...');
    await browser.close();
  } catch (err) {
    console.error('Script Error:', err);
  }
})();
