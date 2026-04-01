const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://www.google.com/search?tbm=shop&q=iphone+13&hl=id&gl=id', { waitUntil: 'domcontentloaded' });
    
    const data = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('.sh-dgr__content, .sh-dlr__list-result, div[data-docid]'));
        if (els.length === 0) return { error: "No selectors found", body: document.body.innerText.substring(0, 500) };
        const text = els[0].textContent || els[0].innerText || '';
        return { count: els.length, firstText: text };
    });
    
    fs.writeFileSync('out_google.json', JSON.stringify(data, null, 2));
    await browser.close();
})();
