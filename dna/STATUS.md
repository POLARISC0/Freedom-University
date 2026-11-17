# Polaris Vending website: status (November 2026)

## Done

- **The full page:** hero, how it works, what we stock, why Polaris, locations, contact and footer, all in the agreed order and wording.
- **Mobile first.** Checked in a browser at phone widths (320, 375 and 390 pixels) and desktop widths (1280, 1366 and 1440). Nothing scrolls sideways, every button and link is at least 44 pixels tall, and the "Get a machine" button fits on a laptop's first screen.
- **The contact form** opens the visitor's email app with the details filled in and encoded correctly.
- **`npm run preview`** shows the site on the computer and on a phone, and lists the placeholders.
- **15 automatic checks pass** (`npm test`).
- **Fast:** the whole site is under 100 KB plus the fonts.

## Missing or not right yet

- **14 PLACEHOLDER lines:**
  - the city;
  - 3 location cards (name and area);
  - the email, the phone, and Instagram, TikTok and X;
  - the two footer links.
- **Not online.** There's no host and no domain yet.
- **The contact form has no server.** It only opens the visitor's email app, so a visitor with no email app set up has to copy the address shown on the page.
- **The logo copy came from an image shared in chat,** not the original file. At small sizes, such as the browser tab, the "P" fades into the star.
- **Not checked on a real iPhone or in Safari,** only in Chrome at phone sizes.
- **Lines Claude wrote that need the owner's check.** In "What we stock" that's the example products. In "Why Polaris" it's "If something breaks, we fix it." and "When you call, you get us." Also "Our first machines are on the way."

## Next, in priority order

1. **Fill in the placeholders** (`dna/SETUP.md`, steps 4 and 5).
2. **Check the lines Claude wrote** and change anything that isn't true for the business.
3. **Look at it on a real phone** with `npm run preview`, iPhone and Android if possible.
4. **Choose a host and a domain,** then put the `site` folder online.
5. **Add a real form service** so messages arrive without the visitor's email app.
6. **Replace the location cards** with real sites as machines go in.
7. **Optional:** the original logo file, and a simplified small logo for the browser tab.
