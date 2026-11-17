# Polaris Vending website: project DNA

## In one line

A single scrolling web page that asks local business owners to host a Polaris Vending machine, plus a small contact form.

## The Polaris family

Polaris is the parent company. Each project below belongs to it.

- **Freedom University** teaches money the way school doesn't: how credit, banks, crypto, coins, stocks and ETFs really work. It's an online school with AI teachers.
- **Polaris Vending** (this website's business) places vending machines in local businesses (gyms, barbershops, schools, offices) at no cost to the business. Polaris stocks and services each machine every week, and the business gets a share of every sale. **Polaris never sells machines.**
- **Orion** is the Discord doorman bot for the community server, Incredible Server.

## Brand rules

- **Sell the skill, never a payout.**
- **Teaching how things work is allowed.** That includes crypto, coins, stocks and ETFs, and it's the core of Freedom University.
- **Polaris never issues or sells its own coin or token.**
- **Polaris never takes investors.**
- **Polaris never recommends a specific coin or investment.** Nothing Polaris says or writes means "buy this".
- **Polaris never promises income.** On this site, "You earn a share of every sale" is as far as it goes. No amounts, no "passive income", no "guaranteed".
- **Tone:** plain language and no hype. Sound like a mate who figured it out, not a salesman.

## Who the site is for

The owner or manager of a gym, barbershop, school or office who might host a machine. They should come away knowing three things:

- it costs them nothing;
- Polaris looks after the machine every week;
- they get a share of every sale.

## What's on the page, top to bottom

1. **Hero:** the logo, "Polaris Vending", the tagline "Always stocked. Always on." and one button, "Get a machine".
2. **How it works,** three steps written by the owner, word for word:
   1. We place the machine at no cost to you.
   2. We stock and service it weekly.
   3. You earn a share of every sale.
3. **What we stock:** snacks, drinks, healthy options, and a mix chosen for each space. Each row has a label like a vending machine's button (A1, B2, C3, D4).
4. **Why Polaris:** reliable, local, and part of the Polaris family.
5. **Locations:** "Coming soon" cards, plus a card inviting the visitor to host one.
6. **Contact:** a form (name, business, phone, message) that opens the visitor's email app, plus email, phone and social links.
7. **Footer:** links to the Polaris family (Polaris, Freedom University, Polaris Vending) and the copyright line.

Anything still to fill in says **PLACEHOLDER** in capitals. There are 14 such lines; `npm run preview` lists them.

## Look

- **Feel:** black background, bold wide type, lots of space and a cinematic opening. It shares its visual language with Freedom University.
- **Colours** (in `site/styles.css`, all from the logo):
  - Page `#000000`
  - Raised surfaces `#06140f`
  - Brand emerald `#177658`
  - Mint highlight `#5fe688`
  - Text `#eef5f1`
  - Quiet text `#9bb0a6`
  - Errors only `#ff8f87`
- **Fonts** (from Google Fonts):
  - Archivo, extra wide and heavy, for headings
  - Geist for text
  - Geist Mono for small labels
- **Logo:** `site/images/polaris-logo.png`, a "P" on a compass star over northern lights. It's also the browser-tab icon. The real logo file wasn't in the project, so this copy came from the image the owner shared in chat. Swap in the original file if there is one.
- **Signature details:**
  - a slow-moving aurora glow behind the logo, inside two compass rings;
  - a pulsing "power light" next to the tagline;
  - an outlined "VENDING" in the title;
  - the vending-button labels A1 to D4;
  - a giant outlined "POLARIS" at the very bottom.

## Where this came from

Built in October 2026 in the GitHub repo POLARISC0/Freedom-University, in the `polaris-vending/` folder of the branch `claude/freedom-university-app-pq2brp`. In November 2026 it was exported to the branch `export/polaris-vending` so it can live as its own project.
