# Polaris Vending website: architecture

## What it is, technically

A static website: one HTML page, one stylesheet, one small script and one image.

- There's no server code, no database and no build step.
- Nothing needs installing to run it, apart from Node.js for the preview and the checks.

## Folder map

| Path | What it does |
| --- | --- |
| `site/` | **Everything that goes online.** Upload this folder to a static host and the site is live. |
| `site/index.html` | Every word on the site and the contact details. This is the file to edit. A comment at the top explains it. |
| `site/styles.css` | Colours, fonts and layout. The design tokens are at the top. |
| `site/contact.js` | Turns the contact form into an email in the visitor's email app (a `mailto:` link). It reads the address from the Email line in the contact details, so the email address only lives in one place. |
| `site/images/polaris-logo.png` | The logo, also used as the browser-tab icon. 512 by 512 pixels, about 52 KB. |
| `preview.js` | The preview server (`npm run preview`). It shows the site at http://localhost:4173, prints an address for a phone on the same Wi-Fi, and lists every line still marked PLACEHOLDER. It never uploads anything. |
| `test/site.js` | Checks the page against the brief (details below). |
| `test/preview.js` | Checks the preview server: right files, right types, nothing outside `site/`. |
| `package.json` | Two commands, `preview` and `test`. No dependencies. |
| `README.md` | The original plain-language guide. |
| `.env.example` | Says the site needs no settings. |

## How the pieces connect

```
index.html ──► styles.css         (the look)
          ├──► contact.js         (the form; reads the email from index.html)
          ├──► images/polaris-logo.png
          └──► Google Fonts       (Archivo, Geist, Geist Mono)

preview.js ──► serves site/ on your computer and lists what's left to fill in
```

## The contact form

There's no server behind it yet. When someone presses **Send**:

1. The browser checks that name, business and phone are filled in.
2. `contact.js` builds an email addressed to the site's email. The subject is "Machine request: <business>", and the body has the name, business, phone and message.
3. The visitor's email app opens with the email ready to send. The page then shows the email address too, in case no email app opens.

Nothing is stored on the website.

## What the checks cover (`npm test`, 15 checks)

- **The page:** the sections are in the right order; the hero has the logo, name, tagline and one button; and the logo doubles as the tab icon.
- **The words:** the three "How it works" lines are word for word; all the stock and reasons items are there; there are at least three "Coming soon" cards; and there's no hype or income-promise wording.
- **Contact and footer:** each of the four form fields has a label, the email and social links are present, and the footer has its family links and copyright line.
- **The form's email:** special characters such as `&`, `#` and line breaks are encoded correctly.
- **The preview server:** it never serves files outside `site/`.

## Tech

| Part | What's used |
| --- | --- |
| Page | Plain HTML5 and CSS (custom properties, grid, `clamp()` sizing, `color-mix()`), no framework |
| Script | One small plain JavaScript file, no libraries |
| Fonts | Google Fonts |
| Preview and checks | Node.js 20.12 or newer, using only what comes with Node |

## Commands

| What | Command |
| --- | --- |
| Preview on this computer and your phone | `npm run preview`, then open http://localhost:4173 |
| Run the checks | `npm test` |
| Stop the preview | Ctrl+C in its window |

## Putting it online later

Upload the `site` folder to any static host, such as Vercel, Netlify, Cloudflare Pages or GitHub Pages. Fill in the placeholders first.
