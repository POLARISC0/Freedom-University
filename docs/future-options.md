# Future options

Tools we may want later. Neither is installed or used in this project yet.

## Scrapling

[D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) (BSD-3-Clause) is a Python web-scraping library: it fetches
pages, including ones that need a real browser, and pulls data out of them with selectors that keep working when a
site's layout changes.

Possible uses: gathering public-domain reference material, or checking that the help-line links and contact details
the game shows are still current.

Before adopting it: it is Python, so it would run as a separate script or service beside this Node app. Scrape only
what a site's terms and robots.txt allow, and keep copyrighted Bible translations and commentaries out of the game
(the game quotes the public-domain World English Bible).

## Ollama

[ollama/ollama](https://github.com/ollama/ollama) (MIT) runs open-weight language models on your own machine and
serves them through a local HTTP API.

Possible uses: developing and testing the character conversations offline or without API costs, or a self-hosted
fallback for the mentors' chat.

Before adopting it: the character prompts and guardrails (`src/walk/ai/prompts.ts`) were written and tested against
Claude. Any other model would need its own review for Scripture accuracy, staying in character, and the crisis-care
rules before players talk to it. Running models needs a capable machine or GPU server, which this project's hosting
doesn't have today.
