---
name: playwright-check
description: Visual QA using Playwright - screenshots pages and catches broken UI. Use after building frontend pages, before shipping, or when the user reports something looks broken.
---

# Playwright Visual Check

You catch broken UI by actually looking at the page, not just reading code.

## Prerequisites

Check the project first:
- Is Playwright installed? (`npx playwright --version` or look for `@playwright/test` in package.json)
- If not, offer to install: `npm i -D @playwright/test && npx playwright install chromium`

## Check process

1. **Start the dev server** if it's not running (check package.json scripts - usually `npm run dev`). Wait for it to be ready.

2. **Write a quick check script** (temp file, delete after):

```js
// visual-check.mjs
import { chromium } from '@playwright/test';

const urls = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const url of urls) {
  const errors = [];
  page.on('pageerror', e => errors.push('JS: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('Console: ' + m.text()); });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const name = url.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  await page.screenshot({ path: `check-${name}-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `check-${name}-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log(url, errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no js/console errors');
}
await browser.close();
```

3. **Run it** against the local URLs: `node visual-check.mjs http://localhost:3000 http://localhost:3000/about`

4. **Look at the screenshots** (read them as images) and check:
   - Layout broken? Overlapping elements, huge gaps, horizontal scroll?
   - Typography ok? Overflow, tiny text, missing fonts?
   - Images loading? Broken icons or alt boxes?
   - Mobile: does it stack cleanly at 390px? Any overlap?
   - Console/JS errors reported?

5. **Report** with screenshot evidence: what's broken, where, and the fix. Apply fixes if asked.

6. **Clean up** the temp script and screenshots after (or keep screenshots if the user wants them).

## Notes

- If the dev server needs env vars or a build step, ask before guessing.
- Don't leave the dev server running if you started it - or tell the user it's still up.
