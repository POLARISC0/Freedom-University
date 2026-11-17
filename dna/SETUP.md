# Polaris Vending website: setup on a Windows PC

Plain steps, in order. Nothing goes online while you do this.

## Settings needed

None. The site has no secrets and no `.env` file. The `.env.example` file just says so.

## 1. Install Node.js (once)

You only need Node.js for the preview and the checks.

1. Go to [nodejs.org](https://nodejs.org) and download the version marked **LTS**, the Windows Installer.
2. Run it and click Next until it finishes.

## 2. Download the site

1. Sign in to GitHub, then open this link:
   `https://github.com/POLARISC0/Freedom-University/archive/refs/heads/export/polaris-vending.zip`
2. In your Downloads folder, right-click `Freedom-University-export-polaris-vending.zip` and choose **Extract All**, then **Extract**.
3. The project folder is `Freedom-University-export-polaris-vending`. Windows sometimes puts it inside another folder with the same name. Use the one that contains `package.json`.

## 3. Preview it

1. Open the project folder in File Explorer, click the address bar at the top, type `cmd` and press Enter.
2. Type `npm run preview` and press Enter. There's nothing to install first.
3. Open **http://localhost:4173** in your browser.
4. To see it on your phone, connect the phone to the same Wi-Fi and open the "On your phone" address the window shows.
5. The window also lists every PLACEHOLDER still to fill in, with its line number.
6. After you edit a file, save it and refresh the browser. Press Ctrl+C in the window to stop.

No Node.js? Double-clicking `site\index.html` opens the page too, but only on this computer.

## 4. Edit the words

- Open `site\index.html` in Notepad (right-click, Open with, Notepad).
- Change only the words between the tags, the parts that look like `<p>` and `</p>`.
- Search for **PLACEHOLDER**, in capitals, to find what's left. That covers:
  - the city;
  - the three location cards;
  - the contact details;
  - the footer links to the Polaris and Freedom University websites.

## 5. Put in the real contact details

In `site\index.html`, search for **CONTACT DETAILS**. The lines under it are:

| Line | What to replace |
| --- | --- |
| **Email** | `PLACEHOLDER@example.com`, in both places on that line. The form sends to this address. |
| **Phone** | `+10000000000` with your number as digits with the country code, for example `+15125550123`. Then replace `PLACEHOLDER (000) 000-0000` with the number the way people should see it. |
| **Instagram, TikTok, X** | `PLACEHOLDER` with your username, in both places on each line. |

For the footer, replace `#PLACEHOLDER-polaris-website` and `#PLACEHOLDER-freedom-university-website` with the full web addresses, starting with `https://`.

When `npm run preview` says "No PLACEHOLDER items left", everything is filled in.

## 6. Check it

```
npm test
```

It should end with `# fail 0`.

## 7. Open the project in Claude Code

1. Install the Claude desktop app for Windows, from the Claude Code desktop page on claude.com, and sign in. Claude Code needs a paid Claude plan.
2. In the app, open the **Code** tab and choose **Local**.
3. Click the folder control, choose **Open folder…** and pick the project folder.
4. Paste the message from `dna/NEW_PROJECT_PROMPT.md` as your first message.

Claude reads `CLAUDE.md` in this folder automatically. Installing Git for Windows (git-scm.com) is optional, but it lets Claude save versions of your work.

## 8. Putting it online (later)

Upload the `site` folder to a static host such as Vercel, Netlify, Cloudflare Pages or GitHub Pages, after the placeholders are filled in. Claude can walk you through it.
