# Polaris Vending website

One web page for business owners (gyms, barbershops, schools, offices) who might host a Polaris Vending machine, with a contact form at the bottom.

It's plain HTML and CSS. There's nothing to install and no build step, and it's completely separate from the Freedom University site and the Orion bot, so changing it can't break either of them.

## See it before it goes online

Nothing here puts the site online. Previewing only shows it to you.

1. Open a terminal in the `polaris-vending` folder.
   - **Mac:** open the Terminal app, type `cd ` (with a space after it), drag the `polaris-vending` folder into the window and press Enter.
   - **Windows:** open the `polaris-vending` folder in File Explorer, click the address bar at the top, type `cmd` and press Enter.
2. Type `npm run preview` and press Enter. It needs Node.js, the same program Orion uses, and nothing else.
3. Open **http://localhost:4173** in your web browser.
4. To see it on your phone, connect the phone to the same Wi-Fi as the computer and open the "On your phone" address the terminal shows.
5. The terminal also lists every PLACEHOLDER still to fill in, with its line number.
6. After you change a file, save it and refresh the browser. To stop the preview, click the terminal and press Ctrl+C.

No terminal handy? Double-click `site/index.html` and it opens in your browser. The phone check needs `npm run preview`.

## Which file holds what

| File | What's in it |
| --- | --- |
| `site/index.html` | Every word on the site, and the contact details. This is the one you'll edit. |
| `site/styles.css` | Colours, fonts and layout. The brand colours are at the top. You shouldn't need to change it. |
| `site/contact.js` | Turns the contact form into an email. Leave it as it is. |
| `site/images/polaris-logo.png` | The logo, which is also the little icon in the browser tab. To change it, replace this file with your own PNG of the same name. A square picture works best. |

Open `site/index.html` in a plain text editor (Notepad, TextEdit in plain-text mode, or VS Code). Change only the words between the tags, the bits that look like `<p>` and `</p>`.

## Fill in the placeholders

Everything still to fill in is marked **PLACEHOLDER**, in capitals. Search `site/index.html` for it. There are spots for:

- **Why Polaris:** your city.
- **Locations:** the three "Coming soon" cards, each with a name and an area. To add or remove a card, copy or delete a whole block from `<li class="card">` to its `</li>`.
- **Contact details:** email, phone, Instagram, TikTok and X.
- **Footer:** links to the Polaris and Freedom University websites.

When `npm run preview` says "No PLACEHOLDER items left", everything is filled in.

### Swapping in the real contact details

In `site/index.html`, search for **CONTACT DETAILS**. The lines under it are:

- **Email:** replace `PLACEHOLDER@example.com` in both places on that line, inside `mailto:` and in the text. The contact form sends to this address.
- **Phone:** replace `+10000000000` with your number written as digits with the country code (for example `+15125550123`). Then replace `PLACEHOLDER (000) 000-0000` with the number the way you want people to see it.
- **Instagram, TikTok and X:** on each line, replace `PLACEHOLDER` with your username in both places, in the link and after the @.

For the footer, search for `#PLACEHOLDER-polaris-website` and `#PLACEHOLDER-freedom-university-website`. Replace each one with the full web address, starting with `https://`.

## The contact form

There's no server behind the form yet. When someone presses **Send**, their email app opens with their name, business, phone and message filled in, addressed to your email. Nothing is stored on the website. If they don't have an email app set up, the page shows them your address to write to. A proper form service can replace this later.

## Checking your edits

`npm test` checks the page still has every section in the right order, the three "How it works" lines word for word, no hype or income promises, a label on every form field, and that the form builds its email correctly. Run it after bigger edits. It should end with `fail 0`.

## Putting it online, later

Everything the website needs is inside the `site` folder. That's the folder to upload to a static host such as Vercel, Netlify, Cloudflare Pages or GitHub Pages. Fill in the placeholders first.
